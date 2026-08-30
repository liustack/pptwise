import type { MenuParamValue } from "../themes/schema"

export type FaceParams = Readonly<Record<string, MenuParamValue>> | undefined

/** Read an optional menu parameter after the theme registration gate. */
export function faceParam<T extends MenuParamValue>(params: FaceParams, name: string, fallback: T): T {
  const value = params?.[name]
  return value === undefined ? fallback : (value as T)
}

/** Read a parameter whose omission has structural meaning to the face. */
export function optionalFaceParam<T extends MenuParamValue>(params: FaceParams, name: string): T | undefined {
  return params?.[name] as T | undefined
}
