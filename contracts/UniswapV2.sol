// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IUniswapV2Router02
 * @dev Interface for Uniswap V2 Router
 */
interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    function quote(uint amountA, uint reserveA, uint reserveB)
        external pure returns (uint amountB);
}

/**
 * @title IUniswapV2Factory
 * @dev Interface for Uniswap V2 Factory
 */
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/**
 * @title IUniswapV2Pair
 * @dev Interface for Uniswap V2 Pair
 */
interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/**
 * @title UniswapV2Adapter
 * @dev Simplified adapter contract for Uniswap V2 interactions
 * @notice This contract provides easy-to-use methods for swapping tokens and adding liquidity
 */
contract UniswapV2Adapter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public immutable uniswapRouter;
    IUniswapV2Factory public immutable uniswapFactory;

    // Events for tracking operations
    event LiquidityAdded(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        address indexed user
    );

    event TokensSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed user
    );

    // Custom errors for gas efficiency
    error InvalidTokenAddress();
    error InvalidAmount();
    error InsufficientAllowance();
    error InsufficientBalance();
    error SlippageExceeded();
    error PairNotExists();
    error TransferFailed();

    /**
     * @dev Constructor sets the Uniswap V2 router address
     * @param _uniswapRouter Address of the Uniswap V2 router
     */
    constructor(address _uniswapRouter) Ownable(msg.sender) {
        require(_uniswapRouter != address(0), "Invalid router address");
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        uniswapFactory = IUniswapV2Factory(uniswapRouter.factory());
    }

    /**
     * @dev Add liquidity to a Uniswap V2 pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @param amountA Desired amount of tokenA
     * @param amountB Desired amount of tokenB
     * @param slippageTolerance Slippage tolerance in basis points (e.g., 100 = 1%)
     * @return amountAActual Actual amount of tokenA added
     * @return amountBActual Actual amount of tokenB added
     * @return liquidity Amount of LP tokens received
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 slippageTolerance
    ) external nonReentrant returns (uint256 amountAActual, uint256 amountBActual, uint256 liquidity) {
        // Input validation
        if (tokenA == address(0) || tokenB == address(0)) revert InvalidTokenAddress();
        if (amountA == 0 || amountB == 0) revert InvalidAmount();
        if (slippageTolerance > 1000) revert InvalidAmount(); // Max 10% slippage

        IERC20 tokenAContract = IERC20(tokenA);
        IERC20 tokenBContract = IERC20(tokenB);

        // Check balances and allowances
        if (tokenAContract.balanceOf(msg.sender) < amountA) revert InsufficientBalance();
        if (tokenBContract.balanceOf(msg.sender) < amountB) revert InsufficientBalance();
        if (tokenAContract.allowance(msg.sender, address(this)) < amountA) revert InsufficientAllowance();
        if (tokenBContract.allowance(msg.sender, address(this)) < amountB) revert InsufficientAllowance();

        // Transfer tokens to this contract
        tokenAContract.safeTransferFrom(msg.sender, address(this), amountA);
        tokenBContract.safeTransferFrom(msg.sender, address(this), amountB);

        // Approve router to spend tokens
        tokenAContract.approve(address(uniswapRouter), amountA);
        tokenBContract.approve(address(uniswapRouter), amountB);

        // Calculate minimum amounts with slippage protection
        uint256 amountAMin = (amountA * (10000 - slippageTolerance)) / 10000;
        uint256 amountBMin = (amountB * (10000 - slippageTolerance)) / 10000;

        // Add liquidity
        (amountAActual, amountBActual, liquidity) = uniswapRouter.addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            amountAMin,
            amountBMin,
            msg.sender,
            block.timestamp + 300 // 5 minutes deadline
        );

        // Refund unused tokens
        uint256 refundA = amountA - amountAActual;
        uint256 refundB = amountB - amountBActual;
        
        if (refundA > 0) {
            tokenAContract.safeTransfer(msg.sender, refundA);
        }
        if (refundB > 0) {
            tokenBContract.safeTransfer(msg.sender, refundB);
        }

        emit LiquidityAdded(tokenA, tokenB, amountAActual, amountBActual, liquidity, msg.sender);
    }

    /**
     * @dev Swap exact input tokens for output tokens
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input tokens
     * @param minOut Minimum amount of output tokens (slippage protection)
     * @return amountOut Actual amount of output tokens received
     */
    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut
    ) external nonReentrant returns (uint256 amountOut) {
        // Input validation
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidTokenAddress();
        if (tokenIn == tokenOut) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();

        IERC20 tokenInContract = IERC20(tokenIn);

        // Check balance and allowance
        if (tokenInContract.balanceOf(msg.sender) < amountIn) revert InsufficientBalance();
        if (tokenInContract.allowance(msg.sender, address(this)) < amountIn) revert InsufficientAllowance();

        // Verify pair exists
        address pair = uniswapFactory.getPair(tokenIn, tokenOut);
        if (pair == address(0)) revert PairNotExists();

        // Transfer tokens to this contract
        tokenInContract.safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router to spend tokens
        tokenInContract.approve(address(uniswapRouter), amountIn);

        // Create path for swap
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        // Execute swap
        uint256[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            msg.sender,
            block.timestamp + 300 // 5 minutes deadline
        );

        amountOut = amounts[1];

        emit TokensSwapped(tokenIn, tokenOut, amountIn, amountOut, msg.sender);
    }

    /**
     * @dev Get quote for token swap
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input tokens
     * @return amountOut Expected amount of output tokens
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        // Input validation
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidTokenAddress();
        if (tokenIn == tokenOut) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();

        // Verify pair exists
        address pair = uniswapFactory.getPair(tokenIn, tokenOut);
        if (pair == address(0)) revert PairNotExists();

        // Create path for quote
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        try uniswapRouter.getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            amountOut = amounts[1];
        } catch {
            revert("Quote calculation failed");
        }
    }

    /**
     * @dev Get reserves for a token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function getReserves(address tokenA, address tokenB) 
        external 
        view 
        returns (uint256 reserveA, uint256 reserveB) 
    {
        address pair = uniswapFactory.getPair(tokenA, tokenB);
        if (pair == address(0)) revert PairNotExists();

        IUniswapV2Pair pairContract = IUniswapV2Pair(pair);
        address token0 = pairContract.token0();
        
        (uint112 reserve0, uint112 reserve1,) = pairContract.getReserves();
        
        if (tokenA == token0) {
            reserveA = uint256(reserve0);
            reserveB = uint256(reserve1);
        } else {
            reserveA = uint256(reserve1);
            reserveB = uint256(reserve0);
        }
    }

    /**
     * @dev Emergency function to recover stuck tokens (only owner)
     * @param token Address of token to recover
     * @param amount Amount to recover
     */
    function emergencyRecoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /**
     * @dev Get router address
     * @return Address of Uniswap V2 router
     */
    function getRouterAddress() external view returns (address) {
        return address(uniswapRouter);
    }

    /**
     * @dev Get factory address
     * @return Address of Uniswap V2 factory
     */
    function getFactoryAddress() external view returns (address) {
        return address(uniswapFactory);
    }
}