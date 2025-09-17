// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MysteryGacha is ERC721, Ownable {
    uint256 public nextTokenId;

    // Rarity definitions
    enum Rarity {
        Common,
        Uncommon,
        Bronze,
        Silver,
        Gold,
        Platinum,
        Rare,
        Epic,
        Legendary,
        Mythic
    }

    // Weights for each rarity, sum should be 100 for percentage-based
    uint256[10] public rarityWeights = [
        30, // Common
        20, // Uncommon
        15, // Bronze
        10, // Silver
        8,  // Gold
        6,  // Platinum
        5,  // Rare
        4,  // Epic
        1,  // Legendary
        1   // Mythic
    ];

    event GachaPulled(address indexed user, uint256 indexed tokenId, Rarity rarity);

    constructor() ERC721("MysteryGachaNFT", "MYG") Ownable(msg.sender) {}

    function pullGacha() public {
        _pullGacha(msg.sender);
    }

    function _pullGacha(address to) internal {
        require(tx.origin == msg.sender, "No contract calls allowed");

        Rarity rarity = _getRandomRarity();
        uint256 tokenId = nextTokenId++;

        _safeMint(to, tokenId);
        emit GachaPulled(to, tokenId, rarity);
    }

    function _getRandomRarity() internal view returns (Rarity) {
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, nextTokenId))) % 100;
        uint256 cumulativeWeight = 0;

        for (uint256 i = 0; i < rarityWeights.length; i++) {
            cumulativeWeight += rarityWeights[i];
            if (rand < cumulativeWeight) {
                return Rarity(i);
            }
        }
        
        // Should not be reached, but as a fallback
        return Rarity.Common;
    }
}