using CleanArchitecture.Application.Branches.Commands.CreateBranch;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Models;
using CleanArchitecture.Application.Users.Commands.UpdateUser;
using CleanArchitecture.Domain.Constants;
using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;
using NUnit.Framework;
using Shouldly;

namespace CleanArchitecture.Application.UnitTests.Users.Commands;

// ─────────────────────────────────────────────────────────────────────────────
// UpdateUserCommandHandler Tests
// ─────────────────────────────────────────────────────────────────────────────
[TestFixture]
public class UpdateUserCommandHandlerTests
{
    private Mock<IIdentityService> _identityService;
    private Mock<IUser> _currentUser;
    private UpdateUserCommandHandler _handler;

    [SetUp]
    public void SetUp()
    {
        _identityService = new Mock<IIdentityService>();
        _currentUser = new Mock<IUser>();

        // Default: caller is NOT the same user being edited (safe scenario)
        _currentUser.Setup(u => u.Id).Returns("caller-id");
        _currentUser.Setup(u => u.Roles).Returns(new List<string> { Roles.Administrator });

        // Default identity service stubs — return success for everything
        _identityService.Setup(s => s.UpdateUserRolesAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync(Result.Success());
        _identityService.Setup(s => s.SetBranchAsync(It.IsAny<string>(), It.IsAny<Guid?>()))
            .ReturnsAsync(Result.Success());
        _identityService.Setup(s => s.UpdatePasswordAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(Result.Success());

        _handler = new UpdateUserCommandHandler(_identityService.Object, _currentUser.Object);
    }

    [Test]
    public async Task Handle_ShouldCallUpdatePassword_WhenNewPasswordProvided()
    {
        // Arrange
        var command = new UpdateUserCommand
        {
            UserId = "target-user-id",
            Roles = new List<string> { Roles.Receptionist },
            BranchId = Guid.NewGuid(),
            NewPassword = "NewSecurePass1!"
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.ShouldBeTrue();
        _identityService.Verify(s => s.UpdatePasswordAsync("target-user-id", "NewSecurePass1!"), Times.Once);
    }

    [Test]
    public async Task Handle_ShouldNotCallUpdatePassword_WhenNewPasswordIsNull()
    {
        // Arrange
        var command = new UpdateUserCommand
        {
            UserId = "target-user-id",
            Roles = new List<string> { Roles.Owner },
            BranchId = null,
            NewPassword = null   // no password change requested
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.ShouldBeTrue();
        _identityService.Verify(s => s.UpdatePasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Test]
    public async Task Handle_ShouldNotCallUpdatePassword_WhenNewPasswordIsWhitespace()
    {
        // Arrange
        var command = new UpdateUserCommand
        {
            UserId = "target-user-id",
            Roles = new List<string> { Roles.Owner },
            BranchId = null,
            NewPassword = "   "   // whitespace — should be treated as empty
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.ShouldBeTrue();
        _identityService.Verify(s => s.UpdatePasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Test]
    public async Task Handle_ShouldReturnFailure_WhenAdminRemovesOwnAdminRole()
    {
        // Arrange — the caller IS the target user and is an Administrator
        const string adminId = "admin-self-edit-id";
        _currentUser.Setup(u => u.Id).Returns(adminId);
        _currentUser.Setup(u => u.Roles).Returns(new List<string> { Roles.Administrator });

        var command = new UpdateUserCommand
        {
            UserId = adminId,  // same as caller — self-edit
            Roles = new List<string> { Roles.Owner },   // strips the Administrator role!
            BranchId = null
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert — anti-self-lock guard must block this
        result.Succeeded.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.Contains("Administrator"));

        // Identity service must NOT have been called at all
        _identityService.Verify(s => s.UpdateUserRolesAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>()), Times.Never);
    }

    [Test]
    public async Task Handle_ShouldSucceed_WhenAdminEditsOwnProfileButKeepsAdminRole()
    {
        // Arrange — admin edits themselves but keeps the Administrator role
        const string adminId = "admin-self-edit-id";
        _currentUser.Setup(u => u.Id).Returns(adminId);
        _currentUser.Setup(u => u.Roles).Returns(new List<string> { Roles.Administrator });

        var command = new UpdateUserCommand
        {
            UserId = adminId,
            Roles = new List<string> { Roles.Administrator },   // preserving own role — safe
            BranchId = null
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.ShouldBeTrue();
        _identityService.Verify(s => s.UpdateUserRolesAsync(adminId, It.Is<IEnumerable<string>>(r => r.Contains(Roles.Administrator))), Times.Once);
    }

    [Test]
    public async Task Handle_ShouldReturnFailure_WhenIdentityServiceFailsOnRoleUpdate()
    {
        // Arrange
        _identityService.Setup(s => s.UpdateUserRolesAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync(Result.Failure(new[] { "Role not found." }));

        var command = new UpdateUserCommand
        {
            UserId = "some-user",
            Roles = new List<string> { "NonExistentRole" },
            BranchId = null
        };

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.ShouldBeFalse();
        // Branch and password should never be called after a role failure
        _identityService.Verify(s => s.SetBranchAsync(It.IsAny<string>(), It.IsAny<Guid?>()), Times.Never);
        _identityService.Verify(s => s.UpdatePasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateBranchCommandHandler Tests
// ─────────────────────────────────────────────────────────────────────────────
[TestFixture]
public class CreateBranchCommandHandlerTests
{
    private Mock<IApplicationDbContext> _context;
    private CreateBranchCommandHandler _handler;
    private List<Branch> _branchStore;

    [SetUp]
    public void SetUp()
    {
        _context = new Mock<IApplicationDbContext>();
        _branchStore = new List<Branch>();

        // Set up DbSet mock that captures Add() calls into our in-memory list
        var mockSet = new Mock<DbSet<Branch>>();
        mockSet.Setup(s => s.Add(It.IsAny<Branch>()))
            .Callback<Branch>(b => _branchStore.Add(b));

        _context.Setup(c => c.Branches).Returns(mockSet.Object);
        _context.Setup(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        _handler = new CreateBranchCommandHandler(_context.Object);
    }

    [Test]
    public async Task Handle_ShouldAddBranchAndReturnNewGuid()
    {
        // Arrange
        var command = new CreateBranchCommand { Name = "Cairo Branch" };

        // Act
        var id = await _handler.Handle(command, CancellationToken.None);

        // Assert
        id.ShouldNotBe(Guid.Empty);
        _branchStore.Count.ShouldBe(1);
        _branchStore[0].Name.ShouldBe("Cairo Branch");
        _context.Verify(c => c.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task Handle_ShouldTrimWhitespace_WhenNameHasLeadingTrailingSpaces()
    {
        // Arrange
        var command = new CreateBranchCommand { Name = "  North Wing  " };

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        _branchStore[0].Name.ShouldBe("North Wing");
    }

    [Test]
    public void Handle_ShouldThrowArgumentException_WhenNameIsEmpty()
    {
        // Arrange — Branch entity setter throws ArgumentException for empty name
        var command = new CreateBranchCommand { Name = "" };

        // Act & Assert
        Should.Throw<ArgumentException>(() => _handler.Handle(command, CancellationToken.None));
    }

    [Test]
    public void Handle_ShouldThrowArgumentException_WhenNameExceeds120Characters()
    {
        // Arrange
        var command = new CreateBranchCommand { Name = new string('A', 121) };

        // Act & Assert
        Should.Throw<ArgumentException>(() => _handler.Handle(command, CancellationToken.None));
    }
}
