import { gql } from "graphql-tag";

export const OrderFieldsFragment = gql`
  fragment OrderFields on Order {
    id
    orderPlacedAt
    code
    state
    active
    total
    totalWithTax
    shippingWithTax
    shippingAddress {
      fullName
      company
      streetLine1
      streetLine2
      city
      postalCode
      country
    }
    customer {
      id
      firstName
      lastName
      emailAddress
    }
    lines {
      id
      quantity
      productVariant {
        id
      }
      discounts {
        adjustmentSource
        amount
        amountWithTax
        description
        type
      }
    }
  }
`;

export const AddItemToOrder = gql`
  ${OrderFieldsFragment}
  mutation addItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        ...OrderFields
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const SetShippingAddress = gql`
  ${OrderFieldsFragment}
  mutation setOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        ...OrderFields
      }
    }
  }
`;

export const SetCustomerForOrder = gql`
  ${OrderFieldsFragment}
  mutation setCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        ...OrderFields
      }
    }
  }
`;

export const SetOrderShippingMethod = gql`
  ${OrderFieldsFragment}
  mutation setOrderShippingMethod($id: ID!) {
    setOrderShippingMethod(shippingMethodId: $id) {
      ... on Order {
        ...OrderFields
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const TransitionToState = gql`
  ${OrderFieldsFragment}
  mutation transitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        ...OrderFields
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
      }
    }
  }
`;

export const AddPaymentToOrder = gql`
  ${OrderFieldsFragment}
  mutation addPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        ...OrderFields
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;
