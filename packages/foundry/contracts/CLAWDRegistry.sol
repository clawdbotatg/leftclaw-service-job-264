// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @notice Minimal interface for ERC20Burnable — used to burn CLAWD from submitters.
 */
interface IERC20Burnable {
    function burnFrom(address account, uint256 amount) external;
}

/**
 * @title CLAWDRegistry
 * @notice Public on-chain submission registry for the CLAWD app build competition.
 *         Users burn CLAWD tokens on Base to submit their app entry.
 * @dev CLAWD token is hardcoded to Base mainnet address.
 *      Burn is performed via burnFrom(), which requires the caller to hold
 *      an allowance granted by the submitter (CLAWD.approve(registry, burnAmount)).
 */
contract CLAWDRegistry is ReentrancyGuard {
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

    /// @notice Pending admin address set during a two-step admin transfer; zero if none in progress
    address public pendingAdmin;

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

    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);

    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

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
     * @param _initialBurnAmount Initial CLAWD burn amount per submission (raw units, must be > 0)
     */
    constructor(address _admin, uint256 _initialBurnAmount) {
        require(_admin != address(0), "Admin cannot be zero address");
        require(_initialBurnAmount > 0, "Initial burn amount must be non-zero");
        admin = _admin;
        burnAmount = _initialBurnAmount;
    }

    // -------------------------------------------------------------------------
    // Public / External
    // -------------------------------------------------------------------------

    /**
     * @notice Submit an app entry by burning `burnAmount` CLAWD tokens.
     * @dev Caller must have approved this contract for at least `burnAmount` CLAWD
     *      before calling this function. The registry calls burnFrom() on the CLAWD
     *      token, which spends the allowance and destroys the tokens.
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
        require(bytes(appName).length > 0 && bytes(appName).length <= 100, "Invalid appName length");
        require(bytes(description).length <= 1000, "Description too long");
        require(bytes(url).length > 0 && bytes(url).length <= 256, "Invalid url length");
        require(bytes(githubUrl).length <= 256, "Github URL too long");

        // Burn CLAWD from caller using burnFrom — requires prior approval
        IERC20Burnable(address(CLAWD)).burnFrom(msg.sender, burnAmount);

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
     * @param newAmount New burn amount in raw token units; must be greater than zero.
     */
    function setBurnAmount(uint256 newAmount) external onlyAdmin {
        require(newAmount > 0, "Burn amount must be non-zero");
        uint256 old = burnAmount;
        burnAmount = newAmount;
        emit BurnAmountUpdated(old, newAmount);
    }

    /**
     * @notice Soft-remove a submission. ID is preserved so the mapping stays stable.
     */
    function removeSubmission(uint256 id) external onlyAdmin {
        require(id > 0 && id <= submissionCount, "Invalid submission id");
        require(!submissions[id].removed, "Submission already removed");
        submissions[id].removed = true;
        emit SubmissionRemoved(id);
    }

    /**
     * @notice Initiate a two-step admin transfer. The new admin must call acceptAdmin()
     *         to complete the transfer.
     * @param newAdmin Address to nominate as the next admin.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }

    /**
     * @notice Accept the pending admin role. Only callable by the address set in
     *         transferAdmin(). Completes the two-step ownership handover.
     */
    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Not pending admin");
        address previous = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferred(previous, admin);
    }
}
