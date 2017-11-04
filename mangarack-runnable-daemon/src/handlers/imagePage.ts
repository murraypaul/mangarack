import * as express from 'express';
import * as mio from '../default';

/**
 * Promises the page image.
 * @internal
 * @param request The request.
 * @param response The response.
 * @param library The library.
 * @return The promise for the page image.
 */
export async function handleAsync(request: express.Request, response: express.Response, library: mio.ILibrary): Promise<void> {
  let result = await library.imageAsync(request.params.seriesId, request.params.chapterId, request.params.pageNumber);
  if (result) {
    response.set('Content-Type', mio.helperService.getContentType(result));
    response.send(result);
  } else {
    response.sendStatus(404);
  }
}
