'use strict';

function normalizeIdentity(value) {
  return String(value || '').replace(/:\d+/, '').split('@')[0].replace(/\D/g, '');
}

function isOwnerIdentity(candidate, configuredOwner) {
  const owner = normalizeIdentity(configuredOwner);
  return Boolean(owner && normalizeIdentity(candidate) === owner);
}

function hasRole(roleSnapshot, candidate) {
  if (!roleSnapshot || roleSnapshot.ok !== true || !(roleSnapshot.admins instanceof Set)) return false;
  const normalized = String(candidate || '').replace(/:\d+/, '');
  return roleSnapshot.admins.has(normalized);
}

module.exports = { normalizeIdentity, isOwnerIdentity, hasRole };
