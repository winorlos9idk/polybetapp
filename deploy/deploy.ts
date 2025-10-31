import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy PredictionMarket contract
  const deployedPredictionMarket = await deploy("PredictionMarket", {
    from: deployer,
    log: true,
  });

  console.log(`PredictionMarket contract: `, deployedPredictionMarket.address);
};
export default func;
func.id = "deploy_contracts"; // id required to prevent reexecution
func.tags = ["PredictionMarket", "FHECounter"];
