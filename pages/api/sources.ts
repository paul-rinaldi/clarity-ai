import { OpenAIModel, Source } from "@/types";
import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import type { NextApiRequest, NextApiResponse } from "next";
import { cleanSourceText } from "../../utils/sources";

type Data = {
  sources: Source[];
};

type SearchType = 'GOOGLE' | 'CONGRESS';

function encodeQueryString(query: string) {
  return encodeURIComponent(query).replace(/%20/g, '+');
}

function generateGoogleSearchURL(query: string) {
  const baseURL = "https://www.google.com/search?q=";
  const encodedQuery = encodeQueryString(query);
  return baseURL + encodedQuery;
}

const search = (query: string, sourceCount: number, searchType: SearchType) => {
  switch(searchType) {
    case 'GOOGLE': return searchViaGoogle(query, sourceCount);
    case 'CONGRESS': return searchViaLance(query, sourceCount);
    default: return searchViaGoogle(query, sourceCount);
  }
};

const searchViaGoogle = async (query: string, sourceCount: number) => {
  const queryUrl = generateGoogleSearchURL(query);

    // GET LINKS
    const response = await fetch(queryUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    const linkTags = $("a");

    let links: string[] = [];

    linkTags.each((i, link) => {
      const href = $(link).attr("href");

      if (href && href.startsWith("/url?q=")) {
        const cleanedHref = href.replace("/url?q=", "").split("&")[0];

        if (!links.includes(cleanedHref)) {
          links.push(cleanedHref);
        }
      }
    });

    const filteredLinks = links.filter((link, idx) => {
      const domain = new URL(link).hostname;

      const excludeList = ["google", "facebook", "twitter", "instagram", "youtube", "tiktok"];
      if (excludeList.some((site) => domain.includes(site))) return false;

      return links.findIndex((link) => new URL(link).hostname === domain) === idx;
    });

    const finalLinks = filteredLinks.slice(0, sourceCount);

    // SCRAPE TEXT FROM LINKS
    return (await Promise.all(
      finalLinks.map(async (link) => {
        const response = await fetch(link);
        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const parsed = new Readability(doc).parse();

        if (parsed) {
          let sourceText = cleanSourceText(parsed.textContent);

          return { url: link, text: sourceText };
        }
      })
    )) as Source[];
};

const searchViaLance = (query: string, sourceCount: number) => {
  
};

const searchHandler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  switch(req.method) {
    case 'GET':
      try {
        const { query, model } = req.body as {
          query: string;
          model: OpenAIModel;
        };
        const { searchType } = req.query as {
          searchType: SearchType
        };
    
        const sourceCount = 4;
    
        const sources = await search(query, sourceCount, searchType);
    
        const filteredSources = (sources as Source[]).filter((source) => source !== undefined);
    
        for (const source of filteredSources) {
          source.text = source.text.slice(0, 1500);
        }
    
        res.status(200).json({ sources: filteredSources });
      } catch (err) {
        console.log(err);
        res.status(500).json({ sources: [] });
      }
      break;
    case 'POST':
      // setup the db?
      break;
  }
};

export default searchHandler;
