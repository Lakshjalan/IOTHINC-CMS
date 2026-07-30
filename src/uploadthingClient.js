import { genUploader } from 'uploadthing/client'

const token = import.meta.env.VITE_UPLOADTHING_TOKEN

export const { uploadFiles } = token 
  ? genUploader({ token }) 
  : { uploadFiles: () => { throw new Error('Uploadthing token is not configured on client') } }

