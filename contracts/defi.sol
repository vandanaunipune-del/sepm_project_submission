// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// interface IPriceFeed {
//     function latestRoundData()
//         external
//         view
//         returns (
//             uint80 roundId,
//             int256 answer,
//             uint256 startedAt,
//             uint256 updatedAt,
//             uint80 answeredInRound
//         );

//     function decimals() external view returns (uint8);
// }

// contract SimpleLendingPool is ReentrancyGuard {
//     using SafeERC20 for IERC20;

//     uint256 public constant BPS = 10_000;
//     uint256 public constant LTV_BPS = 7_000; // 70%
//     uint256 public constant LIQUIDATION_THRESHOLD_BPS = 8_000;
//     uint256 public constant LIQUIDATION_BONUS_BPS = 500; // 5%
//     uint256 public constant ORACLE_MAX_AGE = 1 hours;

//     IERC20 public immutable collateralToken;
//     IERC20 public immutable borrowToken;

//     IPriceFeed public immutable collateralPriceFeed;
//     IPriceFeed public immutable borrowPriceFeed;

//     mapping(address => uint256) public supplied;
//     mapping(address => uint256) public collateral;
//     mapping(address => uint256) public debt;

//     uint256 public totalSupplied;
//     uint256 public totalBorrowed;

//     address public immutable owner;

//     event Supplied(address indexed user, uint256 amount);
//     event CollateralDeposited(address indexed user, uint256 amount);
//     event Borrowed(address indexed user, uint256 amount);
//     event Repaid(address indexed user, uint256 amount);
//     event Withdrawn(address indexed user, uint256 amount);
//     event Liquidated(
//         address indexed liquidator,
//         address indexed borrower,
//         uint256 debtRepaid,
//         uint256 collateralSeized
//     );

//     error InvalidAddress();
//     error InvalidAmount();
//     error InvalidConfiguration();
//     error InvalidOraclePrice();
//     error StaleOraclePrice();
//     error InsufficientLiquidity();
//     error InsufficientCollateral();
//     error UnhealthyPosition();
//     error HealthyPosition();
//     error InsufficientBalance();

//     constructor(
//         address _collateralToken,
//         address _borrowToken,
//         address _collateralPriceFeed,
//         address _borrowPriceFeed
//     ) {
//         if (
//             _collateralToken == address(0) ||
//             _borrowToken == address(0) ||
//             _collateralPriceFeed == address(0) ||
//             _borrowPriceFeed == address(0)
//         ) revert InvalidAddress();

//         if (
//             _collateralToken == _borrowToken ||
//             _collateralPriceFeed == _borrowPriceFeed
//         ) revert InvalidConfiguration();

//         collateralToken = IERC20(_collateralToken);
//         borrowToken = IERC20(_borrowToken);
//         collateralPriceFeed = IPriceFeed(_collateralPriceFeed);
//         borrowPriceFeed = IPriceFeed(_borrowPriceFeed);
//         owner = msg.sender;
//     }

//     // Lenders provide the token borrowers can withdraw.
//     function supply(uint256 amount) external nonReentrant {
//         if (amount == 0) revert InvalidAmount();

//         totalSupplied += amount;
//         supplied[msg.sender] += amount;

//         borrowToken.safeTransferFrom(
//             msg.sender, address(this), amount
//         );

//         emit Supplied(msg.sender, amount);
//     }

//     // Borrowers deposit collateral.
//     function depositCollateral(uint256 amount)
//         external
//         nonReentrant
//     {
//         if (amount == 0) revert InvalidAmount();

//         collateral[msg.sender] += amount;

//         collateralToken.safeTransferFrom(
//             msg.sender, address(this), amount
//         );

//         emit CollateralDeposited(msg.sender, amount);
//     }

//     // Borrow only against adequately valued collateral.
//     function borrow(uint256 amount) external nonReentrant {
//         if (amount == 0) revert InvalidAmount();

//         if (
//             borrowToken.balanceOf(address(this)) < amount
//         ) revert InsufficientLiquidity();

//         debt[msg.sender] += amount;
//         totalBorrowed += amount;

//         if (
//             debtValue(debt[msg.sender]) >
//             collateralValue(collateral[msg.sender])
//                 * LTV_BPS / BPS
//         ) revert InsufficientCollateral();

//         borrowToken.safeTransfer(msg.sender, amount);

//         emit Borrowed(msg.sender, amount);
//     }

//     // Repay all or part of an outstanding loan.
//     function repay(uint256 amount) external nonReentrant {
//         if (amount == 0) revert InvalidAmount();

//         uint256 outstanding = debt[msg.sender];
//         if (outstanding == 0) revert InvalidAmount();

//         uint256 payment = amount > outstanding
//             ? outstanding
//             : amount;

//         debt[msg.sender] = outstanding - payment;
//         totalBorrowed -= payment;

//         borrowToken.safeTransferFrom(
//             msg.sender, address(this), payment
//         );

//         emit Repaid(msg.sender, payment);
//     }

//     // Withdraw supplied liquidity, excluding funds borrowed out.
//     function withdrawSupply(uint256 amount)
//         external
//         nonReentrant
//     {
//         if (amount == 0) revert InvalidAmount();
//         if (supplied[msg.sender] < amount) {
//             revert InsufficientBalance();
//         }
//         if (borrowToken.balanceOf(address(this)) < amount) {
//             revert InsufficientLiquidity();
//         }

//         supplied[msg.sender] -= amount;
//         totalSupplied -= amount;

//         borrowToken.safeTransfer(msg.sender, amount);

//         emit Withdrawn(msg.sender, amount);
//     }

//     // Withdraw collateral only if the remaining loan stays safe.
//     function withdrawCollateral(uint256 amount)
//         external
//         nonReentrant
//     {
//         if (amount == 0) revert InvalidAmount();
//         if (collateral[msg.sender] < amount) {
//             revert InsufficientBalance();
//         }

//         uint256 remaining = collateral[msg.sender] - amount;

//         if (
//             debt[msg.sender] != 0 &&
//             debtValue(debt[msg.sender]) >
//                 collateralValue(remaining)
//                     * LIQUIDATION_THRESHOLD_BPS / BPS
//         ) revert InsufficientCollateral();

//         collateral[msg.sender] = remaining;
//         collateralToken.safeTransfer(msg.sender, amount);

//         emit Withdrawn(msg.sender, amount);
//     }

//     // Repay debt and seize collateral with a liquidation bonus.
//     function liquidate(address borrower, uint256 repayAmount)
//         external
//         nonReentrant
//     {
//         if (borrower == address(0)) revert InvalidAddress();
//         if (repayAmount == 0) revert InvalidAmount();

//         if (healthFactor(borrower) >= 1e18) {
//             revert HealthyPosition();
//         }

//         uint256 outstanding = debt[borrower];
//         uint256 payment = repayAmount > outstanding
//             ? outstanding
//             : repayAmount;

//         uint256 seized = payment
//             * priceOf(borrowPriceFeed)
//             / priceOf(collateralPriceFeed);

//         seized = seized
//             * (BPS + LIQUIDATION_BONUS_BPS) / BPS;

//         if (seized > collateral[borrower]) {
//             seized = collateral[borrower];

//             // Never accept repayment worth more than
//             // the collateral received, including the bonus.
//             payment = seized
//                 * priceOf(collateralPriceFeed)
//                 / priceOf(borrowPriceFeed);

//             payment = payment * BPS
//                 / (BPS + LIQUIDATION_BONUS_BPS);

//             if (payment == 0) revert InvalidAmount();
//         }

//         debt[borrower] -= payment;
//         totalBorrowed -= payment;
//         collateral[borrower] -= seized;

//         borrowToken.safeTransferFrom(
//             msg.sender, address(this), payment
//         );

//         collateralToken.safeTransfer(msg.sender, seized);

//         emit Liquidated(
//             msg.sender, borrower, payment, seized
//         );
//     }

//     // Returns the collateral's USD value, scaled to 1e18.
//     // Assumes collateral and borrow tokens both have 18 decimals.
//     function collateralValue(uint256 amount)
//         public
//         view
//         returns (uint256)
//     {
//         return amount * priceOf(collateralPriceFeed) / 1e8;
//     }

//     function debtValue(uint256 amount)
//         public
//         view
//         returns (uint256)
//     {
//         return amount * priceOf(borrowPriceFeed) / 1e8;
//     }

//     // 1e18 means a health factor of 1.0.
//     function healthFactor(address user)
//         public
//         view
//         returns (uint256)
//     {
//         uint256 userDebt = debt[user];
//         if (userDebt == 0) return type(uint256).max;

//         uint256 adjustedCollateral =
//             collateralValue(collateral[user])
//                 * LIQUIDATION_THRESHOLD_BPS / BPS;

//         return adjustedCollateral * 1e18
//             / debtValue(userDebt);
//     }

//     function priceOf(IPriceFeed feed)
//         public
//         view
//         returns (uint256)
//     {
//         (
//             uint80 roundId,
//             int256 answer,
//             ,
//             uint256 updatedAt,
//             uint80 answeredInRound
//         ) = feed.latestRoundData();

//         if (
//             answer <= 0 ||
//             updatedAt == 0 ||
//             answeredInRound < roundId
//         ) revert InvalidOraclePrice();

//         if (block.timestamp - updatedAt > ORACLE_MAX_AGE) {
//             revert StaleOraclePrice();
//         }

//         uint8 feedDecimals = feed.decimals();

//         // Normalize price to 8 decimal places.
//         if (feedDecimals > 18) revert InvalidConfiguration();

//         if (feedDecimals < 8) {
//             return uint256(answer) * (10 ** (8 - feedDecimals));
//         }

//         if (feedDecimals > 8) {
//             return uint256(answer) / (10 ** (feedDecimals - 8));
//         }

//         return uint256(answer);
//     }
// }
