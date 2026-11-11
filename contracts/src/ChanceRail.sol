// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ChanceRail
/// @notice Free-entry demonstration draws. Not suitable for prizes, gambling or financial use.
contract ChanceRail {
    address public immutable owner;
    uint256 public currentRound = 1;
    bool public roundActive = true;

    mapping(uint256 => address[]) private participants;
    mapping(uint256 => mapping(address => bool)) public hasEntered;
    mapping(uint256 => address) public winners;

    event EntryRecorded(uint256 indexed roundId, address indexed participant);
    event RoundFinalized(uint256 indexed roundId, address indexed winner, uint256 participantCount);
    event RoundStarted(uint256 indexed roundId);

    error OwnerOnly();
    error RoundClosed();
    error RoundStillOpen();
    error AlreadyEntered();
    error NoParticipants();
    error DirectPaymentDisabled();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OwnerOnly();
        _;
    }

    function enterCurrentRound() external {
        if (!roundActive) revert RoundClosed();
        if (hasEntered[currentRound][msg.sender]) revert AlreadyEntered();
        hasEntered[currentRound][msg.sender] = true;
        participants[currentRound].push(msg.sender);
        emit EntryRecorded(currentRound, msg.sender);
    }

    /// @dev Demonstration-only pseudo-random selection. On-chain inputs can be influenced.
    function finalizeCurrentRound() external onlyOwner {
        if (!roundActive) revert RoundClosed();
        address[] storage entries = participants[currentRound];
        if (entries.length == 0) revert NoParticipants();
        uint256 index = uint256(keccak256(abi.encodePacked(
            block.prevrandao,
            blockhash(block.number - 1),
            block.timestamp,
            currentRound,
            entries.length
        ))) % entries.length;
        address winner = entries[index];
        winners[currentRound] = winner;
        roundActive = false;
        emit RoundFinalized(currentRound, winner, entries.length);
    }

    function startNextRound() external onlyOwner {
        if (roundActive) revert RoundStillOpen();
        unchecked { currentRound += 1; }
        roundActive = true;
        emit RoundStarted(currentRound);
    }

    function getParticipants(uint256 roundId) external view returns (address[] memory) {
        return participants[roundId];
    }

    receive() external payable { revert DirectPaymentDisabled(); }
    fallback() external payable { revert DirectPaymentDisabled(); }
}
