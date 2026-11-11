const localEthers = process.env.LOCAL_ETHERS_PATH;
export default {
  server: { host: "127.0.0.1" },
  build: { target: "es2022", sourcemap: false },
  resolve: localEthers ? { alias: { ethers: localEthers } } : undefined,
};
