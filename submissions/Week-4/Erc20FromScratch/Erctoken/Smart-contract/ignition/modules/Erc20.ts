import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const ERC20Module = buildModule("ERC20Module", (m) => {
  
  const name = 'IDOLOR TOKEN'
  const symbol = 'ID'
  const decimals = 8
  const totalSupply = 1e12
  const ERC20 = m.contract("ERC20", [name, symbol, decimals, totalSupply]);

  return { ERC20 };
});

export default ERC20Module;


// //[ ERC20Module ] successfully deployed 🚀

// Deployed Addresses

// ERC20Module#ERC20 - 0x5FbDB2315678afecb367f032d93F642f64180aa3