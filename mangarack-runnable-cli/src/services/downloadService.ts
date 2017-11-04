import * as fs from 'fs';
import * as mio from '../default';

/**
 * Represents the download service.
 */
export let downloadService: mio.IDownloadService = {
  /**
   * Promises to download the chapter.
   * @param provider The provider.
   * @param series The series.
   * @param seriesPreviewImage The series preview image.
   * @param chapter The chapter.
   * @return The promise to download the chapter.
   */
  chapterAsync: async function(provider: mio.IProvider, series: mio.ISeries, seriesPreviewImage: mio.IBlob, chapter: mio.IChapter): Promise<void> {
    let chapterName = getChapterName(series, chapter);
    let chapterPath = getChapterPath(series, chapter);
    if (chapterName.hasValue && chapterPath.hasValue) {
      if( passesChapterFilter(chapter) ) {
        let chapterExists = await mio.promise<boolean>(callback => fs.exists(chapterPath.value, exists => callback(null, exists)));
        if (chapterExists.hasValue && chapterExists.hasValue && !chapterExists.value) {
          console.log(`Fetching ${chapterName.value}`);
          if (!mio.settingService.getBoolean('runnable.cli.dryRun')) {
            let beginTime = Date.now();
            let pages = await chapter.pagesAsync();
            await downloadService.pagesAsync(provider, series, seriesPreviewImage, chapter, pages);
            console.log(`Finished ${chapterName.value} ${prettyElapsedTime(beginTime)}`);
          }
        }
      }
    }
  },

  /**
   * Promises to download the pages.
   * @param provider The provider.
   * @param series The series.
   * @param seriesPreviewImage The series preview image.
   * @param chapter The chapter.
   * @param pages The pages.
   * @return The promise to download the pages.
   */
  pagesAsync: async function(provider: mio.IProvider, series: mio.ISeries, seriesPreviewImage: mio.IBlob, chapter: mio.IChapter, pages: mio.IPage[]): Promise<void> {
    let chapterPath = getChapterPath(series, chapter);
    if (chapterPath) {
      let zip = mio.zipService.create(chapterPath);
      try {
        for (let page of pages) {
          let image = await page.imageAsync();
          let processedImage = await mio.imageService.processAsync(provider, image);
          if (processedImage) {
            await zip.writeAsync(`${format(3, page.number)}.${mio.helperService.getImageExtension(processedImage)}`, processedImage);
          } else {
            throw new Error(`Invalid processed page #${page.number}`);
          }
        }
        await zip.writeAsync(`000.${mio.helperService.getImageExtension(seriesPreviewImage)}`, seriesPreviewImage);
        await zip.writeAsync('ComicInfo.xml', mio.metaService.createXml(series, chapter, pages));
        await zip.commitAsync();
      } catch (error) {
        await zip.rollbackAsync();
        throw error;
      }
//      await zip.writeAsync(`000.${mio.helperService.getImageExtension(seriesPreviewImage)}`, seriesPreviewImage);
      await zip.writeAsync('ComicInfo.xml', mio.metaService.createXml(series, chapter, pages));
      await zip.commitAsync();
    }
  },

  /**
   * Promises to download the series.
   * @param address The address.
   * @return The promise to download the series.
   */
  seriesAsync: async function(address: string): Promise<void> {
    let beginTime = Date.now();
    let provider = mio.openProvider(address);
    let series = await provider.seriesAsync(address);
    let seriesPreviewImage = await series.imageAsync();
    try {
      console.log(`Fetching ${series.title}`);
      for (let chapter of series.chapters) {
        await downloadService.chapterAsync(provider, series, seriesPreviewImage, chapter);
      }
      await cleanAsync(series);
      console.log(`Finished ${series.title} ${prettyElapsedTime(beginTime)}`);
    } catch (error) {
      console.log(`Canceled ${series.title} ${prettyElapsedTime(beginTime)}`);
      throw error;
    }
		if( !mio.settingService.getBoolean('runnable.cli.dryRun') && !mio.settingService.getBoolean('runnable.cli.noRename') ) {
    	await cleanAsync(series);
		}
    console.log(`Finished ${series.title} ${prettyElapsedTime(beginTime)}`);
  }
};

/**
 * Promises to clean obsolete chapters from the series.
 * @param series The series.
 * @return The promise to clean obsolete chapters from the series.
 */
async function cleanAsync(series: mio.ISeries): Promise<void> {
  let seriesName = getSeriesName(series);
  if (seriesName) {
    let seriesExists = await mio.promise<boolean>(callback => fs.exists(seriesName!, exists => callback(undefined, exists)));
    if (seriesExists) {
      let fileNames = await mio.promise<string[]>(callback => fs.readdir(seriesName!, callback));
      if (fileNames) {
        let chapterPaths = series.chapters.map(chapter => getChapterPath(series, chapter));
        let filePaths = fileNames.map(fileName => `${seriesName}/${fileName}`);
        for (let filePath of filePaths) {
          if (chapterPaths.indexOf(filePath) === -1 && /\.cbz$/.test(filePath)) {
            await mio.promise<void>(callback => fs.rename(filePath, `${filePath}.mrdel`, callback));
          }
        }
      }
    }
  }
}

/**
 * Gets the chapter name.
 * @param series The series.
 * @param chapter The chapter.
 * @return The chapter name.
 */
function getChapterName(series: mio.ISeries, chapter: mio.IChapter): string {
  if (isFinite(chapter.number)) {
    let title = getSeriesName(series);
    if (!title.hasValue) {
      return mio.option<string>();
    } else {
			let chapterName = title.value;
			if( chapter.volume.hasValue ) {
				chapterName += ` V${format(2, chapter.volume.value)}`;
			}
			chapterName += ` #${format(3, chapter.number.value)}`;
			if( mio.settingService.getBoolean('runnable.cli.filename.addTitle') && chapter.title.length > 0 ) {
				chapterName += ` \'${chapter.title.replace(/[\. ]*$/, '').replace(/[:\\\\/*?|<>\"]/g, '_').replace(/\p{Cntrl}/g, '_')}\'`;
			}
			if( mio.settingService.getBoolean('runnable.cli.filename.addLanguage') && chapter.language.hasValue ) {
				chapterName += ` (${chapter.language.value})`;
			}
			if( mio.settingService.getBoolean('runnable.cli.filename.addGroup') && chapter.group.hasValue ) {
				chapterName += ` [${chapter.group.value.replace(/[:\\\\/*?|<>\"]/g, '_').replace(/\p{Cntrl}/g, '_')}]`;
			}
			chapterName += '.cbz';
			return mio.option(chapterName);
    }
  } else {
    return '';
  }
}

/**
 * Gets the chapter path.
 * @param series The series.
 * @param chapter The chapter.
 * @return The chapter path.
 */
function getChapterPath(series: mio.ISeries, chapter: mio.IChapter): string {
  let seriesName = getSeriesName(series);
  let chapterName = getChapterName(series, chapter);
  if (seriesName && chapterName) {
    return `${seriesName}/${chapterName}`;
  } else {
    return '';
  }
}

/**
 * Gets the series name.
 * @param series The series.
 * @return The series name.
 */
function getSeriesName(series: mio.ISeries): string {
  return series.title
    .replace(/["<>\|:\*\?\\\/]/g, '')
    .replace(/\.$/, '. (Suffixed)') || '';
}

/**
 * Checks if a single chapter should be considered for
 * downloading, based on user-supplied command line parameters.
 * @param chapter The chapter.
 * @return True if the chapter should be considered.
 */
function passesChapterFilter(chapter: mio.IChapter): boolean {
  let singleChapter = mio.settingService.getString('runnable.cli.filter.chapter.single');
  let fromChapter = mio.settingService.getString('runnable.cli.filter.chapter.from');
  let toChapter = mio.settingService.getString('runnable.cli.filter.chapter.to');
  if( !chapter.number.hasValue ) {
    return false;
  } else if( singleChapter.length > 0 && chapter.number.value != Number(singleChapter) ) {
    return false;
  } else if( fromChapter.length > 0 && chapter.number.value < Number(fromChapter) ) {
    return false;
  } else if( toChapter.length > 0 && chapter.number.value > Number(toChapter) ) {
    return false;
	}
	let fromDate = Date.parse(mio.settingService.getString('runnable.cli.filter.uploaddate.from'));
	let toDate = Date.parse(mio.settingService.getString('runnable.cli.filter.uploaddate.to'));
	if( !isNaN(fromDate) && chapter.uploadDate.hasValue && !isNaN(chapter.uploadDate.value) && chapter.uploadDate.value < fromDate ) {
		return false;
	} else if( !isNaN(toDate) && chapter.uploadDate.hasValue && !isNaN(chapter.uploadDate.value) && chapter.uploadDate.value > toDate ) {
		return false;
	}
	let targetGroup = mio.settingService.getString('runnable.cli.filter.group');
	if( targetGroup.length > 0 && chapter.group.hasValue && !chapter.group.value.match(targetGroup) ) {
		return false;
	}
	return true;
}

/**
 * Formats the number (with possible fraction digits) to be prefixed with leading zeros.
 * @param minimumWholeNumberLength The minimum length of whole numbers.
 * @param value The value.
 * @return The number prefixed with leading zeros.
 */
function format(minimumWholeNumberLength: number, value: number): string {
  let result = value.toString();
  let index = result.indexOf('.');
  for (let i = minimumWholeNumberLength - (index >= 0 ? index : result.length); i > 0; i--) {
    result = '0' + result;
  }
  return result;
}

/**
 * Returns the elapsed time in a pretty format.
 * @param beginTime The begin time.
 * @return The elapsed time in a pretty format.
 */
function prettyElapsedTime(beginTime: number): string {
  let elapsedTime = Date.now() - beginTime;
  let seconds = format(2, Math.floor(elapsedTime / 1000) % 60);
  let minutes = format(2, Math.floor(elapsedTime / 1000 / 60) % 60);
  let hours = format(2, Math.floor(elapsedTime / 1000 / 60 / 60));
  return `(${hours}:${minutes}:${seconds})`;
}
