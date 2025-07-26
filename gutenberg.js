import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const API_BASE = 'https://gutendex.com';

// Helper: HTTPS GET and return parsed JSON
function getJSON(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('Too many redirects'));

    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        let location = res.headers.location;
        if (!location) return reject(new Error(`Redirect with no location header from ${url}`));
        // Convert relative redirect to absolute using base URL
        if (!/^https?:\/\//i.test(location)) {
          const base = new URL(url);
          location = new URL(location, base).href;
        }
        return resolve(getJSON(location, depth + 1));
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

// Search books by title or author
async function searchBooks(query, type = 'title') {
  const encoded = encodeURIComponent(query);
  const url = `${API_BASE}/books/?search=${encoded}`;
  const data = await getJSON(url);
  return data.results.filter(book => {
    if (type === 'title') return book.title.toLowerCase().includes(query.toLowerCase());
    if (type === 'author') {
      return book.authors.some(author =>
        author.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    return false;
  });
}

// Get book details by ID
async function getBookDetails(bookId) {
  const url = `${API_BASE}/books/${bookId}`;
  return await getJSON(url);
}

// Download .txt version of a book by title
async function downloadBookByTitleOrId(titleOrId, filename = 'book.txt') {
    let book;

    // If the input is a number, treat it as an ID
    if (/^\d+$/.test(titleOrId.trim())) {
        try {
            book = await getBookDetails(titleOrId.trim());
        } catch (e) {
            console.log('Failed to fetch book by ID.');
            return;
        }
    } else {
        const books = await searchBooks(titleOrId, 'title');
        if (books.length === 0) {
            console.log('No books found.');
            return;
        }
        book = books[0];
    }

    const txtEntry = Object.entries(book.formats).find(
        ([_, url]) => url.endsWith('.utf-8')
        ) || Object.entries(book.formats).find(
        ([key]) => key.startsWith('text/plain')
    );


    if (!txtEntry) {
        console.log('No plain text format found for this book.');
        return;
    }

    const [_, url] = txtEntry;
    const file = createWriteStream(filename);

    return new Promise((resolve, reject) => {
        const getClient = url => (url.startsWith('https:') ? https : http);

        const doGet = (url) => {
            const client = getClient(url);

            client.get(url, res => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                let location = res.headers.location;
                if (!/^https?:\/\//i.test(location)) {
                const base = new URL(url);
                location = new URL(location, base).href;
                }
                doGet(location);
            } else {
                res.pipe(file);
                file.on('finish', async () => {
                file.close();
                console.log(`Downloaded: ${filename}`);

                try {
                    // Read the file text
                    let text = await fs.readFile(filename, 'utf8');

                    // Find the start marker (including the line)
                    const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
                    const startIndex = text.indexOf(startMarker);
                    if (startIndex === -1) {
                    console.warn('Start marker not found, no trimming done.');
                    } else {
                    // Move to the end of the start marker line
                    const afterStart = text.indexOf('\n', startIndex);
                    text = text.slice(afterStart + 1);
                    }

                    // Find the end marker (including the line)
                    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
                    const endIndex = text.indexOf(endMarker);
                    if (endIndex === -1) {
                    console.warn('End marker not found, no trimming done.');
                    } else {
                    // Cut everything from the start of end marker line to end of text
                    text = text.slice(0, endIndex);
                    }

                    // Write cleaned text back
                    await fs.writeFile(filename, text, 'utf8');
                    console.log('Trimmed Project Gutenberg headers and footers.');

                    resolve();
                } catch (err) {
                    console.error('Error processing downloaded file:', err);
                    reject(err);
                }
                });
            }
            }).on('error', err => {
            console.error('Download failed:', err.message);
            reject(err);
            });
        };

        doGet(url);
    });
}


// ----------------------
// CLI
// ----------------------
const rl = readline.createInterface({ input, output });

console.log("Gutenberg CLI\nOptions:\n1) Search by title\n2) Search by author\n3) Get book details\n4) Download book\n5) Exit");

async function promptLoop() {
  while (true) {
    const answer = await rl.question('\nChoose option: ');
    switch (answer.trim()) {
      case '1': {
        const title = await rl.question('Title: ');
        const results = await searchBooks(title, 'title');
        results.forEach(b =>
          console.log(`[${b.id}] ${b.title} by ${b.authors.map(a => a.name).join(', ')}`));
        break;
      }
      case '2': {
        const author = await rl.question('Author: ');
        const results = await searchBooks(author, 'author');
        results.forEach(b =>
          console.log(`[${b.id}] ${b.title} by ${b.authors.map(a => a.name).join(', ')}`));
        break;
      }
      case '3': {
        const id = await rl.question('Book ID: ');
        const details = await getBookDetails(id);
        console.log(JSON.stringify(details, null, 2));
        break;
      }
      case '4': {
        const title = await rl.question('Book title to download: ');
        await downloadBookByTitleOrId(title);
        break;
      }
      case '5': {
        rl.close();
        return;
      }
      default:
        console.log('Invalid option.');
    }
  }
}

await promptLoop();
