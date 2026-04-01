# Authentication and Authorization

Garrison uses JWT tokens for API authentication and a role-based access control system for authorization.

## Authentication

[[backend/app/api/auth.py]] handles user registration, login (username/password with bcrypt), and Discord OAuth. JWT tokens are issued on login and verified by the [[backend/app/auth/deps.py#get_current_user]] dependency. The frontend stores tokens in localStorage via [[frontend/src/contexts/AuthContext.tsx]].

## Role Hierarchy

[[backend/app/models/user.py#User]] has a global role: OWNER, ADMIN, MODERATOR, or VIEWER. Roles are hierarchical — OWNER has all permissions, VIEWER is read-only. Role checks are enforced by [[backend/app/auth/permissions.py#require_role]].

## Per-Server Permissions

[[backend/app/models/server_permission.py#ServerPermission]] allows overriding a user's global role on specific servers. [[backend/app/auth/permissions.py#require_server_access]] checks both global and server-specific roles, using the higher of the two.

## Credential Security

RCON passwords are encrypted at rest with Fernet symmetric encryption ([[backend/app/auth/security.py]]). User passwords are hashed with bcrypt. The API never returns plaintext passwords.
