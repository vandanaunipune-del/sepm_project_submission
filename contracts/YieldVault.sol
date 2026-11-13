// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ERC-4626 tokenized yield vault with performance fees and a deposit cap. Not audited.
contract YieldVault is ERC4626, Ownable {
    using Math for uint256;

    uint16 public constant BPS = 10_000;
    uint16 public constant MAX_PERFORMANCE_FEE_BPS = 2_000; // 20% hard cap

    uint16 public performanceFeeBps; // fee on reported yield, in bps
    address public feeRecipient;     // receives fee shares
    uint256 public depositCap;       // 0 means unlimited

    event Harvested(uint256 yieldAssets, uint256 feeShares);
    event PerformanceFeeUpdated(uint16 oldBps, uint16 newBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event DepositCapUpdated(uint256 oldCap, uint256 newCap);

    error FeeTooHigh(uint16 bps);
    error ZeroAddress();

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address initialOwner_,
        address feeRecipient_,
        uint16 performanceFeeBps_,
        uint256 depositCap_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(initialOwner_) {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        if (performanceFeeBps_ > MAX_PERFORMANCE_FEE_BPS) revert FeeTooHigh(performanceFeeBps_);

        feeRecipient = feeRecipient_;
        performanceFeeBps = performanceFeeBps_;
        depositCap = depositCap_;
    }

    // Returns remaining capacity, or max uint if uncapped.
    function maxDeposit(address) public view override returns (uint256) {
        uint256 cap = depositCap;
        if (cap == 0) return type(uint256).max;

        uint256 assets = totalAssets();
        return assets >= cap ? 0 : cap - assets;
    }

    // Derives max mintable shares from the deposit cap.
    function maxMint(address receiver) public view override returns (uint256) {
        uint256 assets = maxDeposit(receiver);
        return assets == type(uint256).max ? type(uint256).max : previewDeposit(assets);
    }

    // Reports yield already transferred into the vault and mints fee shares.
    function harvest(uint256 yieldAssets) external onlyOwner {
        if (yieldAssets == 0) return;

        uint256 feeShares;
        uint256 feeAssets = (yieldAssets * performanceFeeBps) / BPS;

        if (feeAssets > 0) {
            // Mint at post-fee price so the fee dilutes depositors by exactly feeAssets.
            feeShares = feeAssets.mulDiv(totalSupply(), totalAssets() - feeAssets);
            _mint(feeRecipient, feeShares);
        }

        emit Harvested(yieldAssets, feeShares);
    }

    // Updates the performance fee, capped at MAX_PERFORMANCE_FEE_BPS.
    function setPerformanceFee(uint16 newBps) external onlyOwner {
        if (newBps > MAX_PERFORMANCE_FEE_BPS) revert FeeTooHigh(newBps);
        emit PerformanceFeeUpdated(performanceFeeBps, newBps);
        performanceFeeBps = newBps;
    }

    // Updates the fee recipient.
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    // Updates the deposit cap; 0 disables the cap.
    function setDepositCap(uint256 newCap) external onlyOwner {
        emit DepositCapUpdated(depositCap, newCap);
        depositCap = newCap;
    }

    // Virtual shares offset that mitigates the first-depositor inflation attack.
    function _decimalsOffset() internal view override returns (uint8) {
        return 3;
    }
}