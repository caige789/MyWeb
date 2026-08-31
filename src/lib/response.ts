/** 统一API响应格式 */
export function ok(data?: any) {
  return Response.json({ code: 200, message: 'success', data });
}

export function err(message: string, code = 400) {
  return Response.json({ code, message }, { status: code });
}
