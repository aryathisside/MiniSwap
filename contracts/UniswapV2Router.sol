// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./UniswapV2Factory.sol";
import "./UniswapV2Pair.sol";

contract UniswapV2Router {
    address public immutable factory;
    address public immutable WETH;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'UniswapV2Router: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = UniswapV2Factory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = UniswapV2Factory(factory).createPair(tokenA, tokenB);
        }
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = UniswapV2Pair(pair).mint(to);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = UniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), 'UniswapV2Router: PAIR_NOT_FOUND');
        _safeTransferFrom(pair, msg.sender, pair, liquidity);
        (amountA, amountB) = UniswapV2Pair(pair).burn(to);
        require(amountA >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal virtual returns (uint amountA, uint amountB) {
        if (UniswapV2Factory(factory).getPair(tokenA, tokenB) == address(0)) {
            UniswapV2Factory(factory).createPair(tokenA, tokenB);
        }
        (uint reserveA, uint reserveB) = getReserves(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        _safeTransferFrom(
            path[0], msg.sender, UniswapV2Factory(factory).getPair(path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }

    function getAmountsOut(uint amountIn, address[] memory path)
        public
        view
        returns (uint[] memory amounts)
    {
        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)
        internal
        pure
        returns (uint amountOut)
    {
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        
        require(amountIn <= type(uint128).max, 'UniswapV2Library: AMOUNT_TOO_LARGE');
        require(reserveIn <= type(uint128).max, 'UniswapV2Library: RESERVE_TOO_LARGE');
        require(reserveOut <= type(uint128).max, 'UniswapV2Library: RESERVE_TOO_LARGE');
        
        // Calculate with fee (0.3% = 997/1000)
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 1000) + amountInWithFee;
        
        require(denominator > 0, 'UniswapV2Library: INVALID_DENOMINATOR');
        
        amountOut = numerator / denominator;
    }

    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        address pair = UniswapV2Factory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            return (0, 0);
        }
        
        try UniswapV2Pair(pair).getReserves() returns (uint112 reserve0, uint112 reserve1, uint32) {
            (reserveA, reserveB) = tokenA < tokenB ? (uint(reserve0), uint(reserve1)) : (uint(reserve1), uint(reserve0));
        } catch {
            return (0, 0);
        }
    }

    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, 'UniswapV2Library: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        
        require(amountA <= type(uint128).max, 'UniswapV2Library: AMOUNT_TOO_LARGE');
        require(reserveA <= type(uint128).max, 'UniswapV2Library: RESERVE_TOO_LARGE');
        require(reserveB <= type(uint128).max, 'UniswapV2Library: RESERVE_TOO_LARGE');
        
        amountB = (amountA * reserveB) / reserveA;
    }

    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            
            require(amountOut > 0, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
            
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? UniswapV2Factory(factory).getPair(output, path[i + 2]) : _to;
            

            address pairAddress = UniswapV2Factory(factory).getPair(input, output);
            require(pairAddress != address(0), 'UniswapV2Router: PAIR_NOT_FOUND');
            
            try UniswapV2Pair(pairAddress).swap(amount0Out, amount1Out, to, new bytes(0)) {
                // Swap successful
            } catch Error(string memory reason) {
                revert(string(abi.encodePacked("UniswapV2Router: SWAP_FAILED - ", reason)));
            } catch {
                revert("UniswapV2Router: SWAP_FAILED");
            }
        }
    }

    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        return tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint value
    ) internal {

        require(token != address(0), 'UniswapV2Router: INVALID_TOKEN');
        require(from != address(0), 'UniswapV2Router: INVALID_FROM');
        require(to != address(0), 'UniswapV2Router: INVALID_TO');
        require(value > 0, 'UniswapV2Router: INVALID_AMOUNT');
        
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2Router: TRANSFER_FROM_FAILED');
    }
} 