// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CLAWDRegistry
 * @notice Public on-chain submission registry for the CLAWD app build competition.
 *         Users burn CLAWD tokens on Base to submit their app entry.
 * @dev CLAWD token is hardcoded to Base mainnet address. Burn = transfer to address(0).
 */
contract CLAWDRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // CLAWD token on Base — hardcoded, not configurable
    IERC20 public constant CLAWD = IERC20(0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07);

    struct Submission {
        uint256 id;
        address submitter;
        string appName;
        string description;
        string url;
        string githubUrl;
        uint256 timestamp;
        bool removed;
    }

    /// @notice Amount of CLAWD (in raw token units, 18 decimals) required to burn per submission
    uint256 public burnAmount;

    /// @notice Admin wallet — has exclusive access to setBurnAmount, removeSubmission, transferAdmin
    address public admin;

    /// @notice Total number of submissions ever made (IDs are 1-indexed)
    uint256 public submissionCount;

    mapping(uint256 => Submission) public submissions;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Submitted(
        uint256 indexed id,
        address indexed submitter,
        string appName,
        uint256 burnAmount,
        uint256 timestamp
    );

    event SubmissionRemoved(uint256 indexed id);

    event BurnAmountUpdated(uint256 oldAmount, uint256 newAmount);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @param _admin            Address to receive admin privileges
     * @param _initialBurnAmount Initial CLAWD burn amount per submission (raw units)
     */
    constructor(address _admin, uint256 _initialBurnAmount) {
        require(_admin != address(0), "Admin cannot be zero address");
        admin = _admin;
        burnAmount = _initialBurnAmount;
    }

    // -------------------------------------------------------------------------
    // Public / External
    // -------------------------------------------------------------------------

    /**
     * @notice Submit an app entry by burning `burnAmount` CLAWD tokens.
     * @dev Caller must have approved this contract for at least `burnAmount` CLAWD.
     *      Burn is performed by transferring to address(0); standard ERC20 does not
     *      block zero-address transfers.
     */
    function submit(
        string calldata appName,
        string calldata description,
        string calldata url,
        string calldata githubUrl
    )
        external
        nonReentrant
    {
        // Pull CLAWD from caller and send to the zero address (burn)
        CLAWD.safeTransferFrom(msg.sender, address(0), burnAmount);

        uint256 id = ++submissionCount;
        uint256 ts = block.timestamp;

        submissions[id] = Submission({
            id: id,
            submitter: msg.sender,
            appName: appName,
            description: description,
            url: url,
            githubUrl: githubUrl,
            timestamp: ts,
            removed: false
        });

        emit Submitted(id, msg.sender, appName, burnAmount, ts);
    }

    // -------------------------------------------------------------------------
    // Admin Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Update the CLAWD burn amount required per submission.
     */
    function setBurnAmount(uint256 newAmount) external onlyAdmin {
        uint256 old = burnAmount;
        burnAmount = newAmount;
        emit BurnAmountUpdated(old, newAmount);
    }

    /**
     * @notice Soft-remove a submission. ID is preserved so the mapping stays stable.
     */
    function removeSubmission(uint256 id) external onlyAdmin {
        require(id > 0 && id <= submissionCount, "Invalid submission id");
        submissions[id].removed = true;
        emit SubmissionRemoved(id);
    }

    /**
     * @notice Transfer admin role to a new address.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        admin = newAdmin;
    }
}
