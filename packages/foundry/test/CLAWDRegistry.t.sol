// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { CLAWDRegistry } from "../contracts/CLAWDRegistry.sol";

// ---------------------------------------------------------------------------
// Minimal ERC20 mock — deployed at the hardcoded CLAWD address via vm.etch
// ---------------------------------------------------------------------------
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    string public name = "Mock CLAWD";
    string public symbol = "CLAWD";
    uint8 public decimals = 18;

    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

// ---------------------------------------------------------------------------
// CLAWDRegistry Tests
// ---------------------------------------------------------------------------
contract CLAWDRegistryTest is Test {
    // Hardcoded CLAWD address matching the contract
    address constant CLAWD_ADDR = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;

    CLAWDRegistry public registry;
    MockERC20 public clawd;

    address public adminWallet = makeAddr("admin");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");

    uint256 constant BURN_AMOUNT = 5000 * 1e18;

    function setUp() public {
        // Deploy MockERC20 and etch its bytecode at the hardcoded CLAWD address
        MockERC20 mock = new MockERC20();
        vm.etch(CLAWD_ADDR, address(mock).code);
        clawd = MockERC20(CLAWD_ADDR);

        // Deploy the registry with admin and initial burn amount
        registry = new CLAWDRegistry(adminWallet, BURN_AMOUNT);

        // Fund test users with CLAWD tokens
        clawd.mint(user1, 100_000 * 1e18);
        clawd.mint(user2, 100_000 * 1e18);
    }

    // -------------------------------------------------------------------------
    // submit()
    // -------------------------------------------------------------------------

    function test_Submit_Success() public {
        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT);
        registry.submit("MyApp", "A great dApp", "https://myapp.xyz", "https://github.com/user/myapp");
        vm.stopPrank();

        assertEq(registry.submissionCount(), 1);

        (
            uint256 id,
            address submitter,
            string memory appName,
            ,
            ,
            ,
            uint256 timestamp,
            bool removed
        ) = registry.submissions(1);

        assertEq(id, 1);
        assertEq(submitter, user1);
        assertEq(appName, "MyApp");
        assertGt(timestamp, 0);
        assertFalse(removed);
    }

    function test_Submit_BurnsSendsToBurnAddress() public {
        uint256 balanceBefore = clawd.balanceOf(user1);

        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT);
        registry.submit("App", "desc", "http://url", "http://github");
        vm.stopPrank();

        // User lost burnAmount
        assertEq(clawd.balanceOf(user1), balanceBefore - BURN_AMOUNT);
        // Burn address received tokens
        assertEq(clawd.balanceOf(address(0)), BURN_AMOUNT);
    }

    function test_Submit_EmitsEvent() public {
        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT);

        vm.expectEmit(true, true, false, false);
        emit CLAWDRegistry.Submitted(1, user1, "MyApp", BURN_AMOUNT, block.timestamp);

        registry.submit("MyApp", "desc", "http://url", "http://github");
        vm.stopPrank();
    }

    function test_Submit_MultipleSubmissions() public {
        // user1 submits
        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT * 2);
        registry.submit("App1", "desc1", "http://url1", "http://github1");
        registry.submit("App2", "desc2", "http://url2", "http://github2");
        vm.stopPrank();

        // user2 submits
        vm.startPrank(user2);
        clawd.approve(address(registry), BURN_AMOUNT);
        registry.submit("App3", "desc3", "http://url3", "http://github3");
        vm.stopPrank();

        assertEq(registry.submissionCount(), 3);
    }

    function test_Submit_RevertsWithoutApproval() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.submit("App", "desc", "http://url", "http://github");
    }

    function test_Submit_RevertsInsufficientBalance() public {
        address poorUser = makeAddr("poor");
        // poorUser has no tokens — mint nothing
        vm.startPrank(poorUser);
        // approve a large amount but balance is 0
        vm.expectRevert();
        registry.submit("App", "desc", "http://url", "http://github");
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // setBurnAmount()
    // -------------------------------------------------------------------------

    function test_SetBurnAmount_AdminCanUpdate() public {
        uint256 newAmount = 1000 * 1e18;

        vm.prank(adminWallet);
        registry.setBurnAmount(newAmount);

        assertEq(registry.burnAmount(), newAmount);
    }

    function test_SetBurnAmount_EmitsEvent() public {
        uint256 newAmount = 1000 * 1e18;

        vm.expectEmit(false, false, false, true);
        emit CLAWDRegistry.BurnAmountUpdated(BURN_AMOUNT, newAmount);

        vm.prank(adminWallet);
        registry.setBurnAmount(newAmount);
    }

    function test_SetBurnAmount_RevertsIfNotAdmin() public {
        vm.prank(user1);
        vm.expectRevert("Not admin");
        registry.setBurnAmount(1000 * 1e18);
    }

    // -------------------------------------------------------------------------
    // removeSubmission()
    // -------------------------------------------------------------------------

    function test_RemoveSubmission_AdminCanRemove() public {
        // First create a submission
        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT);
        registry.submit("App", "desc", "http://url", "http://github");
        vm.stopPrank();

        vm.prank(adminWallet);
        registry.removeSubmission(1);

        (,,,,,,, bool removed) = registry.submissions(1);
        assertTrue(removed);
    }

    function test_RemoveSubmission_EmitsEvent() public {
        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT);
        registry.submit("App", "desc", "http://url", "http://github");
        vm.stopPrank();

        vm.expectEmit(true, false, false, false);
        emit CLAWDRegistry.SubmissionRemoved(1);

        vm.prank(adminWallet);
        registry.removeSubmission(1);
    }

    function test_RemoveSubmission_RevertsIfNotAdmin() public {
        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT);
        registry.submit("App", "desc", "http://url", "http://github");
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert("Not admin");
        registry.removeSubmission(1);
    }

    function test_RemoveSubmission_RevertsInvalidId() public {
        vm.prank(adminWallet);
        vm.expectRevert("Invalid submission id");
        registry.removeSubmission(0);

        vm.prank(adminWallet);
        vm.expectRevert("Invalid submission id");
        registry.removeSubmission(999);
    }

    function test_RemoveSubmission_KeepsIdStable() public {
        // Submit two entries
        vm.startPrank(user1);
        clawd.approve(address(registry), BURN_AMOUNT * 2);
        registry.submit("App1", "desc1", "http://url1", "http://github1");
        registry.submit("App2", "desc2", "http://url2", "http://github2");
        vm.stopPrank();

        // Remove first
        vm.prank(adminWallet);
        registry.removeSubmission(1);

        // Second still accessible under id=2
        (uint256 id,,,,,,, bool removed) = registry.submissions(2);
        assertEq(id, 2);
        assertFalse(removed);
    }

    // -------------------------------------------------------------------------
    // transferAdmin()
    // -------------------------------------------------------------------------

    function test_TransferAdmin_Success() public {
        address newAdmin = makeAddr("newAdmin");

        vm.prank(adminWallet);
        registry.transferAdmin(newAdmin);

        assertEq(registry.admin(), newAdmin);
    }

    function test_TransferAdmin_RevertsIfNotAdmin() public {
        vm.prank(user1);
        vm.expectRevert("Not admin");
        registry.transferAdmin(user1);
    }

    function test_TransferAdmin_RevertsZeroAddress() public {
        vm.prank(adminWallet);
        vm.expectRevert("New admin cannot be zero address");
        registry.transferAdmin(address(0));
    }

    function test_TransferAdmin_OldAdminLosesAccess() public {
        address newAdmin = makeAddr("newAdmin");

        vm.prank(adminWallet);
        registry.transferAdmin(newAdmin);

        // Old admin can no longer call setBurnAmount
        vm.prank(adminWallet);
        vm.expectRevert("Not admin");
        registry.setBurnAmount(1);
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    function test_Constructor_SetsAdminAndBurnAmount() public view {
        assertEq(registry.admin(), adminWallet);
        assertEq(registry.burnAmount(), BURN_AMOUNT);
        assertEq(registry.submissionCount(), 0);
    }

    function test_Constructor_RevertsZeroAdmin() public {
        vm.expectRevert("Admin cannot be zero address");
        new CLAWDRegistry(address(0), BURN_AMOUNT);
    }
}
