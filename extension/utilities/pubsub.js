/**
 * @param {string} websocket
 * @param {() => void} callback
 */
export function subAuthVerify(websocket, callback) {
  return subVerification(websocket, ({ auth }) => {
    if (auth) callback();
  });
}

/**
 * @param {string} websocket
 * @param {(data: any) => void} callback
 */
function subVerification(websocket, callback) {
  const ws = new WebSocket(websocket);
  ws.onmessage = async ({ data }) => callback(JSON.parse(data));
  return () => ws.close();
}
