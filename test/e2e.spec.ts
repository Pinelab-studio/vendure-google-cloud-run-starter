import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import {
  DefaultLogger,
  DefaultSearchPlugin,
  defaultShippingCalculator,
  ID,
  LogLevel,
  mergeConfig,
  Order,
} from "@vendure/core";
import { defaultEmailHandlers, EmailPlugin } from "@vendure/email-plugin";
import {
  createTestEnvironment,
  registerInitializer,
  SimpleGraphQLClient,
  SqljsInitializer,
  testConfig,
  TestServer,
} from "@vendure/testing";
import path from "path";
import { initialData, testPaymentMethod } from "./initial-data";
import {
  AddItemToOrder,
  AddPaymentToOrder,
  SetCustomerForOrder,
  SetOrderShippingMethod,
  SetShippingAddress,
  TransitionToState,
} from "./queries";

/**
 * This should mimic the live env as closely as possible
 */
const config = mergeConfig(testConfig, {
  logger: new DefaultLogger({ level: LogLevel.Debug }),
  paymentOptions: {
    paymentMethodHandlers: [testPaymentMethod],
  },
  apiOptions: {
    port: 3000,
  },
  authOptions: testConfig.authOptions,
  dbConnectionOptions: {
    ...testConfig.dbConnectionOptions,
    synchronize: true,
  },
  shippingOptions: {
    shippingCalculators: [defaultShippingCalculator],
  },
  plugins: [
    DefaultSearchPlugin,
    EmailPlugin.init({
      devMode: true,
      route: "mailbox",
      handlers: defaultEmailHandlers,
      templatePath: path.join(__dirname, "../static/email/templates"),
      outputPath: path.join(__dirname, "test-emails"),
      globalTemplateVars: {
        fromAddress: "test@example.com",
      },
    }),
    AdminUiPlugin.init({
      route: "admin",
      port: 3002,
      adminUiConfig: {
        brand: "Pinelab shops",
        hideVendureBranding: false,
        hideVersion: false,
      },
      app: {
        path: path.join(__dirname, "../__admin-ui/dist"),
      },
    }),
  ],
});

jest.setTimeout(10000);

describe("Vendure", function () {
  let server: TestServer;
  let adminClient: SimpleGraphQLClient;
  let shopClient: SimpleGraphQLClient;
  let serverStarted = false;

  beforeAll(async () => {
    registerInitializer("sqljs", new SqljsInitializer("__data__"));
    ({ server, adminClient, shopClient } = createTestEnvironment(config));
    await server.init({
      initialData: {
        ...initialData,
        paymentMethods: [
          {
            name: testPaymentMethod.code,
            handler: { code: testPaymentMethod.code, arguments: [] },
          },
        ],
      },
      productsCsvPath: "./test/products.csv",
    });
    serverStarted = true;
    await adminClient.asSuperAdmin();
  }, 60000);

  // -------------- Helpers --------------

  /**
   * Add item to active order
   */
  async function addItem(variantId: string, quantity: number): Promise<Order> {
    const { addItemToOrder } = await shopClient.query(AddItemToOrder, {
      productVariantId: variantId,
      quantity,
    });
    return addItemToOrder;
  }

  /**
   * Add default shipping address
   */
  async function setShippingAddress(): Promise<Order> {
    const { setOrderShippingAddress } = await shopClient.query(
      SetShippingAddress,
      {
        input: {
          fullName: "Martinho Pinelabio",
          streetLine1: "Verzetsstraat",
          streetLine2: "12a",
          city: "Liwwa",
          postalCode: "8923CP",
          countryCode: "NL",
        },
      }
    );
    return setOrderShippingAddress;
  }

  /**
   * Add default shipping address
   */
  async function setCustomer(): Promise<Order> {
    const { setCustomerForOrder } = await shopClient.query(
      SetCustomerForOrder,
      {
        input: {
          firstName: "Martinho",
          lastName: "Pinelabio",
          emailAddress: "test@pinelab.studio",
        },
      }
    );
    return setCustomerForOrder;
  }

  /**
   * Add shipping method
   */
  async function setShippingMethod(id: ID): Promise<Order> {
    const { setOrderShippingMethod } = await shopClient.query(
      SetOrderShippingMethod,
      { id }
    );
    return setOrderShippingMethod;
  }

  /**
   * Transition to ArrangingPayment
   */
  async function transitionToArrangingPayment(): Promise<Order> {
    const { transitionOrderToState } = await shopClient.query(
      TransitionToState,
      { state: "ArrangingPayment" }
    );
    return transitionOrderToState;
  }

  /**
   * Add payment by code to active order
   */
  async function addPaymentToOrder(): Promise<Order> {
    const { addPaymentToOrder } = await shopClient.query(AddPaymentToOrder, {
      input: {
        method: testPaymentMethod.code,
        metadata: {
          transactionId: "test",
        },
      },
    });
    return addPaymentToOrder;
  }

  // -------------- Actual testcases --------------

  it("Should start successfully", async () => {
    expect(serverStarted).toBe(true);
  });

  describe("Anonymous order placement", () => {
    it("Should log out", async () => {
      await shopClient.asAnonymousUser();
    });

    it("Should add item to order", async () => {
      const order = await addItem("T_1", 1);
      expect(order.totalWithTax).toBe(157179);
      expect(order.lines[0].productVariant.id).toBe("T_1");
      expect(order.shippingWithTax).toBe(0);
    });

    it("Should add shipping address to order", async () => {
      const order = await setShippingAddress();
      expect(order.shippingAddress.fullName).toBe("Martinho Pinelabio");
      expect(order.shippingAddress.streetLine1).toBe("Verzetsstraat");
      expect(order.shippingAddress.streetLine2).toBe("12a");
      expect(order.shippingAddress.city).toBe("Liwwa");
      expect(order.shippingAddress.postalCode).toBe("8923CP");
      expect(order.shippingAddress.country).toBe("Nederland");
      expect(order.lines[0].productVariant.id).toBe("T_1");
    });

    it("Should add a customer to order", async () => {
      const order = await setCustomer();
      expect(order.customer?.firstName).toBe("Martinho");
      expect(order.customer?.lastName).toBe("Pinelabio");
      expect(order.customer?.emailAddress).toBe("test@pinelab.studio");
    });

    it("Should set shipping method for order", async () => {
      const order = await setShippingMethod("T_1");
      expect(order.shippingWithTax).toBe(500);
    });

    it("Should place order by adding payment", async () => {
      let order = await transitionToArrangingPayment();
      expect(order.state).toBe("ArrangingPayment");
      order = await addPaymentToOrder();
      expect(order.state).toBe("PaymentSettled");
      expect(order.orderPlacedAt).toBeDefined();
    });
  });

  describe("Authenticated order placement", () => {
    let order: Order;

    it("Should log in", async () => {
      await shopClient.asUserWithCredentials(
        "hayden.zieme12@hotmail.com",
        "test"
      );
    });

    it("Should add item to order", async () => {
      order = await addItem("T_1", 1);
      expect(order.totalWithTax).toBe(157179);
      expect(order.lines[0].productVariant.id).toBe("T_1");
      expect(order.shippingWithTax).toBe(0);
    });

    it("Should have logged in customer details", async () => {
      expect(order.customer?.firstName).toBe("Hayden");
      expect(order.customer?.lastName).toBe("Zieme");
      expect(order.customer?.emailAddress).toBe("hayden.zieme12@hotmail.com");
    });

    it("Should add shipping address to order", async () => {
      const order = await setShippingAddress();
      expect(order.shippingAddress.streetLine1).toBe("Verzetsstraat");
      expect(order.shippingAddress.streetLine2).toBe("12a");
      expect(order.shippingAddress.city).toBe("Liwwa");
      expect(order.shippingAddress.postalCode).toBe("8923CP");
      expect(order.shippingAddress.country).toBe("Nederland");
      expect(order.lines[0].productVariant.id).toBe("T_1");
    });

    it("Should set shipping method for order", async () => {
      const order = await setShippingMethod("T_1");
      expect(order.shippingWithTax).toBe(500);
    });

    it("Should place order by adding payment", async () => {
      let order = await transitionToArrangingPayment();
      expect(order.state).toBe("ArrangingPayment");
      order = await addPaymentToOrder();
      expect(order.state).toBe("PaymentSettled");
      expect(order.orderPlacedAt).toBeDefined();
    });
  });

  afterAll(() => {
    return server.destroy();
  });
});
