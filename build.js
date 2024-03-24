import {fileLoader, compile} from "ejs";
import path from "path";
import {cp, writeFile, mkdir, existsSync} from "fs";
import {getFiles, generateDocPage, getDocURI, generateHomePage} from "./src/utils.js";
import {fileURLToPath} from "url";
import {minify} from "html-minifier";
import readline from "node:readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sitemap
// Reference: https://www.sitemaps.org/protocol.html
let buildSitemap = false;
let baseURL = "";
/**
 * Sitemap
 * @type {{loc: string; lastmod: string; changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"}[]}
 * @description
 * This is the sitemap for the build files.
 * Each object in the array represents a navigable page.
 */
const sitemap = [];
/**
 * Sitemap Change Frequency
 */
const scf = "daily";

/**
 * Build Directory
 */
const distDir = path.join(__dirname, "dist");

/**
 * Minify Options
 */

/**
 * [THIS IS THE SKETCHY BIT ABOUT THE BUILD SCRIPT]
 * find all a hrefs that are not external, and add .html to them
 * @param {string} html
 * @returns
 */
function escapeInternalLinks(html) {
	const regex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g;
	return html.replaceAll(regex, (match, p1) => {
		if (p1.startsWith("http")) {
			return match;
		}
		if (p1 === "/" || p1.includes("#")) {
			return match;
		}
		return match.replace(p1, p1 + ".html");
	});
}

function generate_HomePage() {
	const templatePath = path.join(__dirname, "src", "ejs", "index.ejs");
	const templateStr = fileLoader(templatePath, "utf8");
	const template = compile(templateStr, {filename: templatePath});

	var html = template(generateHomePage());
	html = escapeInternalLinks(html);
	html = minify(html, {
		keepClosingSlash: true,
		removeOptionalTags: false,
		removeComments: true,
		collapseWhitespace: true,
		minifyJS: true,
	});

	// Add to sitemap
	if (buildSitemap)
		sitemap.push({
			loc: `${baseURL}/`,
			lastmod: new Date().toISOString(),
			changefreq: scf,
		});

	return html;
}

/**
 *
 * @param {*} template
 * @param {{path: string; title: string; files?: [];}[]} docTree
 * @returns
 */
function generate_DocPages(template, docTree) {
	for (let i = 0; i < docTree.length; i++) {
		if (docTree[i].files) {
			// this is a directory
			generate_DocPages(template, docTree[i].files);
			continue;
		}

		const fn = getDocURI(docTree[i]["path"], true);
		const generate = generateDocPage(fn);
		var html = template(generate);
		html = escapeInternalLinks(html);
		html = minify(html, {
			keepClosingSlash: true,
			removeOptionalTags: false,
			removeComments: true,
			collapseWhitespace: true,
			minifyJS: true,
		});
		writeFile(path.join(distDir, fn + ".html"), html, (err) => {
			if (err) {
				console.error("Error writing file", err);
			}
		});
		// Add to sitemap
		if (buildSitemap) {
			sitemap.push({
				loc: `${baseURL}/${fn}.html`,
				lastmod: new Date().toISOString(),
				changefreq: scf,
			});
		}
		// Log
		console.log("=> Generated " + fn + ".html");
	}
}

/**
 * Build the site
 * Steps:
 * 1. Ask to build the sitemap
 * 2. Make the dist folder
 * 3. Save the Home Page
 * 4. Save the Doc Pages
 * 5. Copy public folder files to dist folder
 * 6. Save the sitemap
 */
async function build() {
	// 1. Ask user if they want to build the sitemap
	if (process.argv.includes("--sitemap")) {
		buildSitemap = true;
		console.log("\nBuilding sitemap...");
	} else {
		// Ask user if they want to build the sitemap
		if ((await askQuestion("Do you want to build a sitemap? (y/N):")) === "y") {
			buildSitemap = true;
		} else {
			console.log("No sitemap will be built.");
		}
	}
	if (buildSitemap) {
		if (process.argv.includes("--baseurl")) {
			baseURL = process.argv[process.argv.indexOf("--baseurl") + 1];
			console.log(`Using base URL: ${baseURL}`);
		} else {
			// Ask user for the base URL
			baseURL = await askQuestion("Enter the base URL (e.g. https://example.com):");
			// remove trailing slash
			baseURL = baseURL.replace(/\/$/, "");
		}
	}

	// 2. Dist folder
	console.log("\nBuilding...\n");
	if (!existsSync(distDir)) {
		mkdir(distDir, (err) => {
			if (err) {
				console.error("Error creating dist folder", err);
				return;
			}
		});
		console.log("\nCreated dist folder");
	}

	// 3. Save Home Page
	console.log("\nGenerating Home Page");
	let html = minify(generate_HomePage(), {
		keepClosingSlash: true,
		removeOptionalTags: false,
		removeComments: true,
		collapseWhitespace: true,
		minifyJS: true,
	});
	writeFile(path.join(distDir, "index.html"), html, (err) => {
		if (err) {
			console.error("Error writing file", err);
			return;
		}
	});
	console.log("=> Generated index.html\n");

	/*
	 * 4. Save Doc Pages
	 */
	// Since all docs pages use same template
	const templatePath = path.join(__dirname, "src", "ejs", "doc.ejs");
	const templateStr = fileLoader(templatePath, "utf8");
	const template = compile(templateStr, {filename: templatePath});
	// Get the files
	const docs = getFiles(path.join(__dirname, "content"));
	console.log("Generating Doc Pages");
	// Generate the pages
	generate_DocPages(template, docs);

	// 5. Copy public folder files to dist folder
	cp(
		path.join(__dirname, "public"),
		path.join(__dirname, "dist"),
		{recursive: true, force: true},
		(err) => {
			if (err) {
				console.error(
					"Error copying public folder to dist folder. Please manually move the contents of public folder to dist folder.",
					err,
				);
			}
		},
	);

	// 6. Save sitemap
	if (buildSitemap) {
		console.log("\nGenerating Sitemap");
		const sitemapPath = path.join(distDir, "sitemap.xml");
		let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
		sitemap.forEach((page) => {
			sitemapXML += `<url><loc>${page.loc}</loc><lastmod>${page.lastmod}</lastmod><changefreq>${page.changefreq}</changefreq></url>\n`;
		});
		sitemapXML += `</urlset>`;
		writeFile(sitemapPath, sitemapXML, (err) => {
			if (err) {
				console.error("Error writing sitemap file", err);
			}
		});
		console.log("=> Generated sitemap.xml");

		// Generate robots.txt
		const robotsPath = path.join(distDir, "robots.txt");
		const robotsTxt = `User-agent: *\n\nSitemap: ${baseURL}/sitemap.xml`;
		writeFile(robotsPath, robotsTxt, (err) => {
			if (err) {
				console.error("Error writing robots.txt file", err);
			}
		});
		console.log("=> Generated robots.txt\n");
	}

	// Success message
	console.log("\nBuild complete! Files are saved in dist folder. 🎉\n");
}

build();

/**
 * Helper function to create a readline interface
 * @param {string} query
 */
function askQuestion(query) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) =>
		rl.question(query, (ans) => {
			rl.close();
			resolve(ans);
		}),
	);
}
