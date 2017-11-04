import * as mio from '../../default';
import {createChapter} from './chapter';
import {enhance} from '../enhance';
import {scan} from '../scan';
const httpService = mio.dependency.get<mio.IHttpService>('IHttpService');
const htmlService = mio.dependency.get<mio.IHtmlService>('IHtmlService');
const remapGenreType: mio.IDictionary = {'Oneshot': 'One Shot', 'Sci-fi': 'Science Fiction'};

/**
 * Promises the series.
 * @param address The address.
 * @return The promise for the series.
 */
export async function createSeriesAsync(address: string): Promise<mio.ISeries> {
  let document = await downloadDocumentAsync(address, false);
  return createSeries(document);
}

/**
 * Creates the series.
 * @param document The selector.
 * @return The series.
 */
function createSeries(document: mio.IHtmlServiceDocument): mio.ISeries {
  return {
    artists: getArtists(document),
    authors: getAuthors(document),
    chapters: enhance(getChapters(document)),
    genres: mio.toGenreType(getGenres(document)),
    imageAsync: () => downloadImageAsync(document),
    summary: getSummary(document),
    title: getTitle(document),
    type: mio.toSeriesType(getType(document), mio.SeriesType.Manga)
  };
}

/**
 * Promises the document.
 * @param address The address.
 * @param hasAttemptedLogin Indicates whether logging has been attempted.
 * @return The promise for the document.
 */
async function downloadDocumentAsync(address: string, hasAttemptedLogin: boolean): Promise<mio.IHtmlServiceDocument> {
  let body = await httpService().text(address, mio.ControlType.TimeoutWithRetry).getAsync();
  let document = htmlService().load(body);
  let isLoggedIn = Boolean(document('#user_navigation.logged_in').first().text());
  if (!isLoggedIn) {
    let password = mio.settingService.getString('component.core.batoto.password');
    let username = mio.settingService.getString('component.core.batoto.username');
    if (!hasAttemptedLogin && username && password) {
      const loginAddress = 'https://bato.to/forums/index.php?app=core&module=global&section=login&do=process';
      await httpService().text(loginAddress, mio.ControlType.TimeoutWithRetry, {origin: 'https://bato.to'}).postAsync({
        auth_key: document('input[name=auth_key]').attr('value'),
        ips_password: password,
        ips_username: username,
        referer: document('input[name=referer]').attr('value'),
        rememberMe: '1'
      });
      await mio.promise(callback => setTimeout(callback, 1000));
      return downloadDocumentAsync(address, true);
    } else {
      throw new Error('Invalid \'component.core.batoto.username\' or \'component.core.batoto.password\'.');
    }
  } else {
    return document;
  }
}

/**
 * Promises the image.
 * @param $ The selector.
 * @return The promise for the image.
 */
function downloadImageAsync($: mio.IHtmlServiceDocument): Promise<mio.IBlob> {
  let address = $('img[src*=\'/uploads/\']').first().attr('src');
  if (address) {
    return httpService().blob(address, mio.ControlType.TimeoutWithRetry).getAsync();
  } else {
    throw new Error('Invalid series cover address.');
  }
}

/**
 * Retrieves each artist.
 * @param $ The selector.
 * @return Each artist.
 */
function getArtists($: mio.IHtmlServiceDocument): string[] {
  return $('td:contains(Artist:)').next().find('a')
    .map((_, a) => $(a).text())
    .get();
}

/**
 * Retrieves each author.
 * @param $ The selector.
 * @return Each author.
 */
function getAuthors($: mio.IHtmlServiceDocument): string[] {
  return $('td:contains(Author:)').next().find('a')
    .map((_, a) => $(a).text())
    .get();
}

/**
 * Retrieves each child.
 * @param $ The selector.
 * @return Each child.
 */
function getChapters($: mio.IHtmlDocument): mio.IChapter[] {
	let results: mio.IChapter[] = [];
	let langMatch = 'tr';
	let targetLanguage = mio.settingService.getString('runnable.cli.filter.language');
	if( targetLanguage.length == 0 ) {
		langMatch +=	'.lang_English';
	} else if( targetLanguage != 'All' ) {
		langMatch +=	'.lang_' + targetLanguage;
	}
	/**
	 * Relies on the fact that the page definition used by bata.to
	 * has the reader element before the other elements.
	 */
	$(langMatch).find('td').map((index, td) => {
		let foundMatch = false;
		$(td).find('a').map((index, a) => {
			let address = $(a).attr('href');
			if (address) {
				if( address.match('reader') ) {
					let metadata = scan($(td).text());
					results.push(createChapter(address, metadata));
					foundMatch = true;
				} else if( address.match('group') ) {
					results[results.length-1].group = mio.option<string>($(td).text());
					foundMatch = true;
				} else if( address.match('user') ) {
					foundMatch = true;
				}
			}
		});
		$(td).find('div').map((index, div) => {
			let title = $(div).attr('title');
			if( title && $(td).html().indexOf('all_flags') > 0 ) {
				results[results.length-1].language = mio.option<string>(title);
				foundMatch = true;
			}
		});
		if( !foundMatch ) {
			let possibleDate = $(td).text();
			let convertedDate = getChapterDate(possibleDate);
			if( convertedDate.hasValue ) {
				results[results.length-1].uploadDate = convertedDate;
			}
		}
	 });
	 return results.reverse();
 }

/**
 * Retrieves each genre.
 * @param $ The selector.
 * @return Each genre.
 */
function getGenres($: mio.IHtmlServiceDocument): string[] {
  let isMature = Boolean($('.ipsBox .clear').first().next().text());
  let initialArray = (isMature ? ['Mature'] : []);
  return initialArray.concat($('td:contains(Genres:)').next().find('a')
    .map((_, a) => $(a).text())
    .get()
    .map(value => remapGenreType[value] || value));
}

/**
 * Retrieves the summary.
 * @param $ The selector.
 * @return The summary.
 */
function getSummary($: mio.IHtmlServiceDocument): string {
  let html = $('td:contains(Description:)').next().html();
  let text = $('<div />').html(html.replace(/<br\s*\/?>/g, '\n')).text();
  return text;
}

/**
 * Retrieves the title.
 * @param $ The selector.
 * @return The title.
 */
function getTitle($: mio.IHtmlServiceDocument): string {
  return $('h1.ipsType_pagetitle').text();
}

/**
 * Retrieves the type.
 * @param $ The selector.
 * @return The type.
 */
function getType($: mio.IHtmlServiceDocument): string {
  let text = $('td:contains(Type:)').next().text();
  let match = text.match(/^(.*)\s+\(.*\)$/);
  return match ? match[1] : text;
}

/**
 * Converts a string to a date, using the known
 * formats from Batato.
 * @param possibleDate The input string
 * @return the date, if valid
 */
function getChapterDate( possibleDate: string ) : mio.IOption<number> {
	let matchArchive = possibleDate.match(/^(.*) \[A\]$/i);
	if( matchArchive ) {
		possibleDate = matchArchive[1];
	}
	let matchAMinute = possibleDate.match(/^A minute ago$/i); // Not seen
	let matchRecentMinutes = possibleDate.match(/^(\d*) minutes ago$/i); // Seen
	let matchAnHour = possibleDate.match(/^An hour ago$/i); // Seen
	let matchRecentHours = possibleDate.match(/^(\d*) hours ago$/i); // Seen
	let matchADay = possibleDate.match(/^A day ago$/i); // Seen
	let matchRecentDays = possibleDate.match(/^(\d*) days ago$/i); // Seen
	let matchAWeek = possibleDate.match(/^A week ago$/i); // Seen
	let matchRecentWeeks = possibleDate.match(/^(\d*) weeks ago$/i); // Seen
	if( matchAMinute ) {
		return mio.option<number>(Date.now() - 60 * 1000);
	} else if( matchRecentMinutes ) {
		return mio.option<number>(Date.now() - +matchRecentMinutes[1] * 60 * 1000);
	} else if( matchAnHour ) {
		return mio.option<number>(Date.now() - 60 * 60 * 1000);
	} else if( matchRecentHours ) {
		return mio.option<number>(Date.now() - +matchRecentHours[1] * 60 * 60 * 1000);
	} else if( matchADay ) {
		return mio.option<number>(Date.now() - 24 * 60 * 60 * 1000);
	} else if( matchRecentDays ) {
		return mio.option<number>(Date.now() - +matchRecentDays[1] * 24 * 60 * 60 * 1000);
	} else if( matchAWeek ) {
		return mio.option<number>(Date.now() - 7 * 24 * 60 * 60 * 1000);
	} else if( matchRecentWeeks ) {
		return mio.option<number>(Date.now() - +matchRecentWeeks[1] * 7 * 24 * 60 * 60 * 1000);
	} else {
		let pm = possibleDate.match(/^(.*) PM$/i);
		let matchMidday = possibleDate.match(/^(.*) \- 12:\d\d PM$/i);
		let matchAMPM = possibleDate.match(/^(.*) [AP]M$/i);
		if( matchAMPM ) {
			possibleDate = matchAMPM[1];
		}
		let matchRemoveDash = possibleDate.match(/^(.*) \- (.*)$/);
		if( matchRemoveDash ) {
			possibleDate = matchRemoveDash[1] + ' ' + matchRemoveDash[2];
		}
		let convertedDate = Date.parse(possibleDate);
		if( !isNaN(convertedDate) ) {
			if( pm && !matchMidday ) {
				convertedDate += 12 * 60 * 60 * 1000;
			}
			return mio.option<number>(convertedDate);
		}
	}
	return mio.option<number>();
}
