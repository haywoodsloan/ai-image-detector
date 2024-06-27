import { readFile } from 'fs/promises';
import hb from 'handlebars';
import { join } from 'path';

const HtmlPath = 'html/';
const StaticHtmlPath = join(HtmlPath, 'static/');
const TemplateHtmlPath = join(HtmlPath, 'template/');

/**
 * @param {string} htmlName
 */
export async function getStaticHtml(htmlName) {
  const path = join(StaticHtmlPath, `${htmlName}.html`);
  return await readFile(path, 'utf8');
}

/**
 * @param {string} templateName
 */
export async function getTemplateHtml(templateName) {
  const path = join(TemplateHtmlPath, `${templateName}.html.hbs`);
  const content = await readFile(path, 'utf8');
  return hb.compile(content);
}
