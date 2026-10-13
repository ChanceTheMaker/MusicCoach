import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PUBLIC_ORIGIN='https://musiccoach.example';
process.env.SETUP_TOKEN='owner-private-setup-code';
const {allowedHost,secureSession,checkSetupToken}=await import('./hosting.mjs');
test('public requests use the configured origin and secure cookies',()=>{
 assert(allowedHost('musiccoach.example'));
 assert(!allowedHost('attacker.example'));
 assert(!allowedHost('musiccoach.example.attacker.example'));
 assert(secureSession({socket:{encrypted:false}}));
});
test('first administrator requires owner setup token; later learners do not',()=>{
 assert.throws(()=>checkSetupToken(true,''),{status:403});
 assert.throws(()=>checkSetupToken(true,'wrong'),{status:403});
 checkSetupToken(true,process.env.SETUP_TOKEN);
 checkSetupToken(false,'');
});
