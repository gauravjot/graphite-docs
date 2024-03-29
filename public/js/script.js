// Sidebar toggle: breakpoint `md`
let sb = document.getElementById("sidebar");
let content = document.getElementById("content");
let nb = document.getElementById("navbar");
let isMobile = window.matchMedia("only screen and (max-width: 1023px)").matches;
if (isMobile) {
	hideSidebar();
}
window.addEventListener("resize", () => {
	isMobile = window.matchMedia("only screen and (max-width: 1023px)").matches;
	if (isMobile) {
		hideSidebar();
	} else {
		showSidebar();
	}
});
function toggleSidebar() {
	if (sb.getAttribute("aria-hidden") === "true") {
		showSidebar();
	} else {
		hideSidebar();
	}
}
function showSidebar() {
	if (isMobile) {
		sb.setAttribute("aria-hidden", "false");
		content.classList.remove("sidebar-open");
	} else {
		sb.setAttribute("aria-hidden", "false");
		content.classList.add("sidebar-open");
		content.classList.remove("ml-16");
	}
}
function hideSidebar() {
	if (window.matchMedia("only screen and (min-width: 1536px)").matches) {
		return; // dont hide sidebar on large screens
	}
	if (isMobile) {
		sb.setAttribute("aria-hidden", "true");
		content.classList.remove("sidebar-open");
	} else {
		sb.setAttribute("aria-hidden", "true");
		content.classList.remove("sidebar-open");
		content.classList.add("ml-16");
	}
}

// Expand accordion for open page
const sbDocList = document.getElementById("sidebar-doc-list").getElementsByTagName("a");
for (let i = 0; i < sbDocList.length; i++) {
	if (sbDocList[i].getAttribute("aria-current") === "true") {
		let parent = sbDocList[i].parentElement;
		while (parent.id !== "sidebar-doc-list") {
			// if tagName is button, then it is an accordion
			if (parent.tagName === "DIV" && parent.classList.contains("accordion")) {
				console.log(parent);
				parent.setAttribute("aria-expanded", "true");
			}
			parent = parent.parentElement;
		}
		break;
	}
}

// Sidebar accordions on click listeners
const sbAccordions = document.getElementsByClassName("accordion");
for (let i = 0; i < sbAccordions.length; i++) {
	// Get first element of the accordion
	const btn = sbAccordions[i].getElementsByTagName("button")[0];
	btn.addEventListener("click", function (e) {
		e.preventDefault();
		btn.parentElement.setAttribute(
			"aria-expanded",
			btn.parentElement.getAttribute("aria-expanded") === "true" ? "false" : "true",
		);
	});
}

// Get all headings under the element with id `md-content`
const mdContent = document.getElementById("md-content");
const mdHeads = mdContent.querySelectorAll("h2, h3, h4, h5, h6");
// Get all hrefs of a tag inside heading, also note the level
const mdHeadingList = [];
for (let i = 0; i < mdHeads.length; i++) {
	mdHeadingList.push({
		text: mdHeads[i].textContent,
		href: mdHeads[i].querySelector("a").href,
		level: mdHeads[i].tagName,
	});
}
// Render the table of contents
const mdToc = document.getElementById("toc");
for (let i = 0; i < mdHeadingList.length; i++) {
	const li = document.createElement("li");
	li.innerHTML = `<a href="${mdHeadingList[i].href}">${mdHeadingList[i].text}</a>`;
	giveMarginForHeading(li, mdHeadingList[i]);
	mdToc.appendChild(li);
}
function giveMarginForHeading(li, heading) {
	if (heading.level === "H2" || heading.level === "H1") {
		li.classList.add("pl-0");
	} else if (heading.level === "H3") {
		li.classList.add("pl-2");
	} else if (heading.level === "H4") {
		li.classList.add("pl-4");
	} else {
		li.classList.add("pl-6");
	}
}
// Highlight the current heading in toc on page scroll
let tocLinks = document.getElementById("toc");
if (typeof tocLinks !== "undefined" && tocLinks !== null) {
	tocLinks = tocLinks.getElementsByTagName("a");
	window.addEventListener("scroll", () => {
		// If mobile, return
		if (isMobile) {
			return;
		}
		let latest;
		let fromTop = window.scrollY;
		for (let i = 0; i < mdHeadingList.length; i++) {
			let section = document.getElementById(mdHeadingList[i].href.split("#")[1]);
			// When heading is halfway from top, highlight the toc link
			if (
				section.offsetTop <= fromTop + screen.height / 10 &&
				section.offsetTop + section.offsetHeight > fromTop + screen.height / 10
			) {
				// Remove if new heading is selected
				latest = tocLinks[i];
			}
		}
		if (latest) {
			for (let i = 0; i < tocLinks.length; i++) {
				tocLinks[i].setAttribute("aria-current", "false");
			}
			latest.setAttribute("aria-current", "true");
		}
	});
}

// Auto-hide Nav bar
let prevScrollpos = window.scrollY;
window.onscroll = function () {
	let currentScrollPos = window.scrollY;
	if (currentScrollPos < 300 || prevScrollpos > currentScrollPos) {
		nb.style.top = "0";
		sb.classList.remove("shift-up");
		document.getElementById("toc-sidebar").classList.remove("shift-up");
	} else {
		// Check if user is not on mobile and sidebar is not expanded
		// In that case, we dont take away the navbar
		if (isMobile && sb.getAttribute("aria-hidden") === "false") {
			return;
		}
		nb.style.top = "-6rem";
		sb.classList.add("shift-up");
		document.getElementById("toc-sidebar").classList.add("shift-up");
	}
	prevScrollpos = currentScrollPos;
};

// When anchor links are clicked, have some offset from top
// see: https://jsfiddle.net/ianclark001/eqtosjtv/
(function (document, history, location) {
	var HISTORY_SUPPORT = !!(history && history.pushState);

	var anchorScrolls = {
		ANCHOR_REGEX: /^#[^ ]+$/,
		OFFSET_HEIGHT_PX: 96,

		/**
		 * Establish events, and fix initial scroll position if a hash is provided.
		 */
		init: function () {
			this.scrollToCurrent();
			window.addEventListener("hashchange", this.scrollToCurrent.bind(this));
			document.body.addEventListener("click", this.delegateAnchors.bind(this));
		},

		/**
		 * Return the offset amount to deduct from the normal scroll position.
		 * Modify as appropriate to allow for dynamic calculations
		 */
		getFixedOffset: function () {
			return this.OFFSET_HEIGHT_PX;
		},

		/**
		 * If the provided href is an anchor which resolves to an element on the
		 * page, scroll to it.
		 * @param  {String} href
		 * @return {Boolean} - Was the href an anchor.
		 */
		scrollIfAnchor: function (href, pushToHistory) {
			let match, rect, anchorOffset;

			if (!this.ANCHOR_REGEX.test(href)) {
				return false;
			}

			match = document.getElementById(href.slice(1));

			if (match) {
				rect = match.getBoundingClientRect();
				anchorOffset = window.scrollY + rect.top - this.getFixedOffset();
				window.scrollTo(window.scrollY, anchorOffset);

				// Add the state to history as-per normal anchor links
				if (HISTORY_SUPPORT && pushToHistory) {
					history.pushState({}, document.title, location.pathname + href);
				}
			}

			return !!match;
		},

		/**
		 * Attempt to scroll to the current location's hash.
		 */
		scrollToCurrent: function () {
			this.scrollIfAnchor(window.location.hash);
		},

		/**
		 * If the click event's target was an anchor, fix the scroll position.
		 */
		delegateAnchors: function (e) {
			let elem = e.target;

			if (elem.nodeName === "A" && this.scrollIfAnchor(elem.getAttribute("href"), true)) {
				e.preventDefault();
			}
		},
	};

	window.addEventListener("DOMContentLoaded", anchorScrolls.init.bind(anchorScrolls));
})(window.document, window.history, window.location);
