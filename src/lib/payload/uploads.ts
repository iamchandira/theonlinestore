import path from 'path'

/**
 * Where uploaded files live. Locally: the project folder (media/, review-media/, private/). On the server:
 * UPLOADS_DIR (e.g. /srv/theonlinestore/uploads), outside the build folder, so deploys never wipe uploads
 * and backups have one place to copy.
 */
export const uploadDir = (name: string) => path.resolve(process.env.UPLOADS_DIR || process.cwd(), name)
