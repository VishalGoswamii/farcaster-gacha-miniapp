// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MysteryGacha
 * @dev An ERC721 smart contract for a free gacha vending machine on Base Sepolia.
 * It mints a new NFT with a rarity determined by a weighted random chance.
 */
contract MysteryGacha is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // A counter for unique token IDs. This prevents ID reuse.
    Counters.Counter private _tokenIdCounter;

    // The price to pull the gacha, set to 0 for a free testnet experience.
    uint256 public pullPrice = 0;

    // A mapping from rarity tiers (0-9) to their weights for the random draw.
    // The sum of all weights must be equal to 1000 for a proper percentage calculation.
    uint16[] public rarityWeights;

    // Event emitted after a successful gacha pull.
    // `rarityTokenId` directly corresponds to the rarity tier (e.g., 0 for common, 9 for mythic).
    event GachaPulled(address indexed user, uint256 indexed rarityTokenId);

    constructor(
        string memory _name,
        string memory _symbol,
        uint16[] memory _rarityWeights
    )
        ERC721(_name, _symbol)
        ReentrancyGuard()
        Ownable(msg.sender)
    {
        // Ensure the sum of weights is 1000 for a proper percentage calculation.
        uint16 totalWeight;
        for (uint i = 0; i < _rarityWeights.length; i++) {
            totalWeight += _rarityWeights[i];
        }
        require(totalWeight == 1000, "Rarity weights must sum to 1000");

        // Store the rarity weights.
        rarityWeights = _rarityWeights;
    }

    /// @dev Allows a user to perform a gacha pull.
    /// @dev It requires a payment of `pullPrice` (which is 0 in this testnet version).
    /// @dev A random rarity is selected based on the configured weights, and a corresponding NFT is minted.
    function pullGacha() public payable nonReentrant {
        // Ensure the correct payment has been sent. Since this is a testnet version, the price is 0.
        require(msg.value >= pullPrice, "Not enough ETH to pull gacha.");

        // Get a pseudo-random number to determine the rarity.
        // We use a combination of block properties and the sender address for a simple and accessible randomness.
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, _tokenIdCounter.current()))) % 1000;

        // Determine the rarity tier based on the random number and weights.
        uint16 cumulativeWeight = 0;
        uint256 selectedRarityId;
        for (uint i = 0; i < rarityWeights.length; i++) {
            cumulativeWeight += rarityWeights[i];
            if (randomNumber < cumulativeWeight) {
                selectedRarityId = i;
                break;
            }
        }
        
        // Mint the new NFT. The actual token ID is a unique counter.
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _mint(msg.sender, newTokenId);
        
        // Emit an event with the rarity ID, which the front-end will listen for.
        emit GachaPulled(msg.sender, selectedRarityId);
    }
}