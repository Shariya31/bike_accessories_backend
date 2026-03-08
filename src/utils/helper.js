import { z } from "zod"

export function formatZodError(error) {
  const tree = z.treeifyError(error)

  const fieldErrors = {}

  if (tree.properties) {
    for (const key in tree.properties) {
      fieldErrors[key] = tree.properties[key].errors
    }
  }

  return fieldErrors
}

export const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp
}