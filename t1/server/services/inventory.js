// Inventory domain boundary: mutations are implemented in the API service transaction
// today and can be moved behind this interface as the domain grows.
export const movementTypes = Object.freeze(['receive', 'issue', 'adjustment', 'transfer']);
