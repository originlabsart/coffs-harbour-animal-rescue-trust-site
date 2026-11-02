/* AI image switch. Every image slot on the site already points at its final file through a
   data-ai attribute (assets/ai/<slot>.jpg) and shows a fallback photo until that file exists.
   When you drop a generated image into assets/ai/, add its slot name here, e.g. 'hero-bg',
   or use ['*'] once every file in ai-shotlist.json is in place. */
window.CHART_AI_READY = [];
