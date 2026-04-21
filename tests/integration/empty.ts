// Stub for `server-only` in the integration test environment. The real
// package throws at module load when imported from a client bundle; for
// vitest there is no bundle distinction, so an empty module is the right
// substitute.
export {};
