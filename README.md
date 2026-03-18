# lgtv-vpn
This fork focuses on compatibility with older LG TVs. It keeps the app working on legacy webOS browser engines and older devices that struggle with newer JavaScript features.

A small LG webOS TV app that wraps an OpenVPN client so you can start and stop VPN connections directly from your TV without an external router or device.

<img width="1830" height="668" alt="lg_vpn2" src="https://github.com/user-attachments/assets/9c07e479-1d45-47b8-bbf6-f2ea46c8ee42" />

## What the app does
- Uses the bundled OpenVPN binary to start a VPN connection on your LG TV.
- Talks to the Homebrew Channel service to run OpenVPN in the background and manage its lifecycle.
- Provides a simple on-device UI to connect, disconnect, and view connection status.
- The VPN connection is kept even when switching apps. So Youtube / Netflix etc. is also running through the VPN connection.


## Installation options
### Install a published IPK
1. Download the latest `com.sk.app.lgtv-vpn_*.ipk` from the project releases.
2. Install the IPK via `ares-install` or with the [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop).

### Build the IPK yourself
1. Install Node.js, then install the development dependencies:
   ```bash
   npm install
   ```
2. Build the legacy-compatible app bundle:
   ```bash
   npm run build
   ```
   This copies the app into `build/com.sk.app.lgtv-vpn/` and transpiles app-owned JavaScript to ES5-safe output.
3. Install the webOS TV CLI so you have access to `ares-package` and `ares-install`.
4. Package the generated app directory:
   ```bash
   ares-package build/com.sk.app.lgtv-vpn
   ```
   This produces an IPK file such as `com.sk.app.lgtv-vpn_0.0.1_all.ipk` in the current directory.
5. Deploy the generated IPK to your TV:
   ```bash
   ares-install com.sk.app.lgtv-vpn_0.0.1_all.ipk
   ```

## Development checks
Run the local validation steps before packaging:

```bash
npm run lint
npm test
```

`npm run lint` checks the app and build scripts, while `npm test` rebuilds the app, verifies ES5 syntax across the packaged JavaScript files, and checks for app-owned APIs that still require newer engines.

## Provide your VPN profiles
The app expects your OpenVPN profiles to live in `/media/developer/apps/usr/palm/applications/com.sk.app.lgtv-vpn/profiles` on the TV:
1. Copy your `.ovpn` files (and any referenced certificates/keys) into that folder (possible also with [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop).
2. Launch the app and select the desired profile from the drop-down list, then press **Connect**.

## Requirements
- An LG TV with webOS that has the Homebrew Channel with root installed and running.
- Valid OpenVPN configuration files that work with your VPN provider.

## Legacy compatibility notes
- `com.sk.app.lgtv-vpn/js/index.js` now avoids `Promise`, `async`/`await`, arrow functions, template literals, `String.prototype.includes`, and `classList`.
- `com.sk.app.lgtv-vpn/js/legacy-polyfills.js` adds lightweight polyfills for `Date.now`, `Function.prototype.bind`, `String.prototype.trim`, `Array.prototype.indexOf`, `Array.prototype.forEach`, and `Array.prototype.filter`.
- Vendored files in `webOSTVjs-1.2.4/` and `lib/` are shipped largely unchanged. They are already ES5 syntax-safe, but still rely on core ES5 browser features such as `Object.keys` and `Object.defineProperty`.

## Stability and troubleshooting
- The app is still experimental and may not be fully stable yet. If it becomes unresponsive, restart the TV with QuickStart disabled.
- You can terminate any leftover OpenVPN processes through the root shell on the TV if a restart is not possible.
