export function randomToken(len = 24) {
  const s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += s[Math.floor(Math.random()*s.length)];
  return out;
}
