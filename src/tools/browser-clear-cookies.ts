import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({ workspaceId: z.string() });

/**
 * Borrar las cookies del espacio.
 *
 * Cierra la sesion de cualquier sitio en el que el navegador estuviera dentro,
 * por eso la plataforma la marca como accion que pide confirmacion. Devuelve
 * cuantas habia para que quede constancia de lo que se borro.
 */
export default async function browserClearCookies(args: unknown) {
  const { workspaceId } = schema.parse(args);
  const context = await sessionMgr.getOrCreate(workspaceId);
  const antes = (await context.cookies()).length;
  await context.clearCookies();
  const despues = (await context.cookies()).length;
  sessionMgr.touch(workspaceId);
  return { cleared: antes - despues, before: antes, after: despues };
}
