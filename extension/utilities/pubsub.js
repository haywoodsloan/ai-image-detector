/**
 * @param {string} websocket
 * @param {() => void} callback
 */
export function subForAuthVerify(websocket, callback) {
  return subForVerification(websocket, ({ auth }) => {
    if (auth) callback();
  });
}

/**
 * @param {string} websocket
 * @param {(data: any) => void} callback
 */
function subForVerification(websocket, callback) {
  const ws = new WebSocket(websocket);
  ws.onmessage = async ({ data }) => callback(JSON.parse(data));
  return () => ws.close();
}
