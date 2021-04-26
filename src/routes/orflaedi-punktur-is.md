---
title: Örflæði.is - Motivation and Tech Stack
date: 2020-03-06
---

![](/blog/graphic.png)

I recently launched a side project – basically a buyer’s guide for e-bikes in Iceland. It’s been a
few years since I worked on a substantial coding project and it has been a surprising amount of fun.

Link: [www.örflæði.is](https://www.orflaedi.is/)

Late last year I actually worked on something that I never got around to publishing. At home we had
a baby in November and there were some quiet moments in the first few weeks where I could learn
SwiftUI, the new iOS framework for declarative UI. I created a simple Python backend and iOS app
that scrapes air particulate data from the environmental agency in Iceland and presents a
geo-coordinate proximity sorted list of stations to the user. I had never done anything in either
ObjectiveC or Swift so it was quite a learning curve. Apple rejected the app because it replicates
website functionality. I argued that there was actually some useful sorting based on device location
but the appeal was rejected too.

On the e-bike project I am hosting a mobile-first web solution so there is no application to reject.

## Motivation

I’m a big believer in human sized vehicles in the urban setting. I believe e-bikes will dominate
bike sales and is a potential disruptor of car centricity in urban planning and lifestyles. I have
been an advocate for e-bikes in Iceland, have monitored import numbers, written articles, been
interviewed by newspapers, maintained a newsletter about micromobility with ~1,000 readers,
participated in panels on planning, spoken with ministers, consulted retailers and helped the
ministry of finance structure a VAT rebate for e-bikes and micromobility vehicles. I’ve also taken
some crap from bike advocates that dislike motors and car maniacs who feel threatened. All part of
the fun of doing unpaid advocacy work.

In my opinion incumbent bike retailers have not embraced electric motors and been mostly reactive to
increasing consumer demand. The growth in bikes is mostly due to motorization broadening the appeal
to new consumer segments. This is a an opportunity for retailers and new entrants appealing to new
segments. People who love racers and Rapha hats are not good at appealing to family people looking
for commuting solutions.

The space is highly competitive and there are few companies in the supply chain that have captured
truly defensible businesses — except for Bosch who have built a resilient brand for high-torque
motors and nicely designed displays. Future brands may capture more intelligence at fleet levels but
that is conjecture. For now, profits are slim but volume is increasing and consumers are benefiting.

We have all the ingredients for a high growth market with a very high ceiling on ownership rates.
Vehicles are person sized and therefore a highly personal preference. Most consumers will decide
based on emotional factors and don’t have the interest to discern specs. Frame design, ride comfort
and cycling lane access are winning attributes.

All of this calls for research tools to navigate a broad range of options and none currently exist.

## Design

I am not a designer. I browse dribbble.com and combine ideas that are easy to implement in CSS. I
did not design anything in Sketch. I shift to „CSS mode“ when my flexibly scoped coding resulted in
things that looked just too ugly to keep looking at — using Tailwind CSS so I could stay in HTML
mode as much as possible. The way [Tailwind](https://tailwindcss.com) works is that you get
thousands of modular styles for common patterns and apply those directly to elements instead of
writing styles in CSS.

```html
<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
	Click me
</button>
```

This gives you a good looking button without any CSS. When you have repeatable composed patterns you
can use the `@apply` directive to move things to CSS without styling from scratch.

## Backend & Hosting

My familiarity with Python and Postgres is substantial so I don’t even review anything else. This is
where I can pick up a lot of velocity and I know the hosting environment well.

One of the main requirements is to reliably scrape the retailer websites for bikes and specs. I have
used BeautifulSoup and python-requests to scrape sites before. For this project I looked into Scrapy
for the first time and loved what I saw. The difference is that Scrapy is a proper framework with a
heavy focus on the developer experience as opposed to two distinct libraries. To crawl sites you
write spiders which are just Python scripts with a class that subclasses `scrapy.Spider`.

```python
import scrapy


class BerlinSpider(scrapy.Spider):
    name = "berlin"

    start_urls = [
        "https://www.reidhjolaverzlunin.is/collections/rafmagnshjol",
    ]

    def parse(self, response):
        for link in response.css(".product>a"):
            yield response.follow(link, self.parse_product)

    def parse_product(self, response):

        price = int("".join(response.css(".money::text")[0].re(r"\d+")))
        sku = response.css(".product-single::attr('class')").re(r"product-(\d+)")[0]

        yield {
            "sku": sku,
            "name": response.css(".section__title-text::text").get(),
            "make": response.css("h4.section__title-desc a::text").get(),
            "price": price,
            "file_urls": [response.css(".product-single__photo__img::attr('data-pswp-src')").get()],
            "scrape_url": response.url,
        }
```

This is all it takes to get all bikes from `reidhjolaverzlunin.is`. Awesome! You can choose between
XPath or CSS selectors — power or simplicity — or a mix of both. I’m a big fan of Scrapy now. One of
my favorite things is `scrapy shell <url>` which pops you into an ipython session with the
`response` object your spider would receive for a particular URL. I had a shell, and Firefox with
developer tools to inspect the DOM and knocked out 14 scrapers in three or four coding sessions.

I’m using [FastAPI](https://fastapi.tiangolo.com) for the second time now. I’m amazed that you could
take something like Flask (which I have used on projects ranging from tiny to huge with great
success and no complaints), add async and make the API even better. Impressive. It has deeper
integration for JSON API requests and responses — which Flask remains mostly agnostic about, leaving
input validation to other libraries. In FastAPI you get sanitized input with developer friendly
error reporting — although I’m not using any of these features for this project, but it’s good to
know that adding a public JSON API is only a few lines of code.

There is currently only one view with different filters which I pass and combine as query
parameters. I could add some caching to the front page as it doesn’t change dynamically unless there
are scrapes which only ever happen a few times a day. I should really do that. But the PageSpeed
score is already 100!

## Frontend

I went back and forth with the frontend stack. There is no logged-in UX and I want everything to be
super SEO friendly and fast. The idea of backend React rendering is not appealing and I don’t have a
lot of experience running Node.js as a web service. Besides; I really wanted to use Python and
FastAPI.

I ended up using the Jinja2 template engine which has amazing composability, macros and inheritance
patterns.

What about interactive JavaScript bits? The appeal of React is that you sacrifice backend rendering
(at least in Python) but move rendering closer to JavaScript which does DOM manipulation where
re-renders are calculated based on an internal DOM representation in the client. For now the site is
very light on JavaScript. There are only hide/show or collapse/expand features and I wrote those in
TypeScript without any UI libraries (just `document.querySelector` and things). Not sure I even
needed TypeScript, but it will come in handy with more complexity further down the road. I have one
dependency which is lazy loading images based on viewport and scroll position to save bandwidth.

## Other things

After some research I settled on <a href="https://www.imgix.com/">imgix</a> for image hosting and
resizing. Turns out you can just scrape image urls, then hand the external image link over to imgix
and set attributes for color trimming to remove whitespace from the bike images, detect the best
compression and serve different sizes based on device DPI (webp+x2 for iPhone for example). This was
really handy because although most bikes are on a white background many of them were floated with
different amounts of whitespace on the image canvas, making the grid of bikes appear chaotic. Not
the first time I use imgix. Love this service and API.

I’m kind of obsessed with [Render.com](https://www.render.com). It’s like Heroku but without mucking
about with the CLI and buildpacks. Things "just work" and the price is fair. For a while I thought I
would need NGiNX reverse proxying to a uwsgi backend and maybe even a CDN for the static assets for
a proper production environment. But I hate Docker, CloudFront, S3 and I hate VPS.

FastAPI uses Starlette which is an async http library. With async and uvicorn you get acceptable
response times for static serving. This means you don’t take as big a performance penalty for not
having NGiNX or CDN hosting for the JS and CSS bundles (... only two additional requests).

Between static assets being served with an async framework and imgix delivering thumbnails via edge
locations I decided to drop NGiNX. Which means my hosting requirements are just a Python 3 service
on Render.com.

Finally there is [Poetry](http://poetry.eustace.io). This is a really well architected package
manager that does _much_ better management of requirements than pip or Pipenv. It also abstracts
virtualenvs and separates development requirements. I’m happy to see this project mature and gather
momentum. Python really needs this. Unfortunately Render.com does not support this so you need to
keep track of a `requirements.txt` file separately. Fortunately Poetry makes this bridging
relatively easy with a simple export command:

```bash
> poetry export --without-hashes -f requirements.txt > requirements.txt
```

<hr>

I hope this was useful or fun or whatever.

Check out the code on [github.com/jokull/orflaedi](https://github.com/jokull/orflaedi).
