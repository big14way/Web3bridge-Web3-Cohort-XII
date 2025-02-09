import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";



const SMSModule = buildModule("SMSModule", (m) => {
 
  const SMS = m.contract("SMS");

  return { SMS };
});

export default SMSModule;