#!/usr/bin/env python3
"""
Regenerate sitemap.xml from the pages that actually exist.

    python3 tools/gen-sitemap.py

Generated rather than hand-written so it cannot drift: every new course
page appears the next time this runs, and a page that is deleted stops
being advertised to Google. lastmod comes from the file's last commit,
so it reflects real edits instead of the day the sitemap was built.
"""
import datetime
import glob
import html
import os
import subprocess

SITE = 'https://brixgate.com'

# Application flows and one-off documents. Also in robots.txt; keep the
# two lists in step.
SKIP = {
    'apply.html', 'callback.html', 'certificate.html', 'brixer-certificate.html',
    'certificate-template.html', 'verify.html',
    'ai-readiness.html',   # redirect to /aiquiz
    'aiquiz.html',         # redirect to /aiquiz
}

# Placeholder programme pages with no backend record behind them. Listing
# these would invite Google to index pages that cannot be applied to.
PLACEHOLDER = {
    'programme-data.html', 'programme-devops.html', 'programme-education.html',
    'programme-healthcare.html', 'programme-hr.html', 'programme-legal.html',
    'programme-manufacturing.html', 'programme-operations.html',
    'programme-pm.html', 'programme-product.html',
}

PRIORITY = {
    'index.html': '1.0',
    'foundations.html': '0.9', 'professionals.html': '0.9', 'programme.html': '0.9',
    'organisations.html': '0.8', 'experts.html': '0.7',
    'terms.html': '0.3', 'privacy-policy.html': '0.3',
}


def lastmod(path):
    try:
        out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', path],
                             capture_output=True, text=True, timeout=10).stdout.strip()
        if out:
            return out
    except Exception:
        pass
    return datetime.date.today().isoformat()


def main():
    urls = []
    for p in sorted(glob.glob('*.html')):
        if p in SKIP or p in PLACEHOLDER:
            continue
        loc = SITE + ('/' if p == 'index.html' else '/' + p)
        urls.append((loc, lastmod(p), PRIORITY.get(p, '0.6')))

    # the quiz lives at /aiquiz, served by aiquiz/index.html
    if os.path.exists('aiquiz/index.html'):
        urls.append((SITE + '/aiquiz', lastmod('aiquiz/index.html'), '0.8'))

    urls.sort(key=lambda u: (-float(u[2]), u[0]))

    body = '\n'.join(
        '  <url>\n'
        '    <loc>%s</loc>\n'
        '    <lastmod>%s</lastmod>\n'
        '    <priority>%s</priority>\n'
        '  </url>' % (html.escape(loc), mod, pri)
        for loc, mod, pri in urls)

    with open('sitemap.xml', 'w') as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                 + body + '\n</urlset>\n')

    print('sitemap.xml: %d urls' % len(urls))
    for loc, mod, pri in urls:
        print('  %-4s %-52s %s' % (pri, loc, mod))
    print('excluded: %d application pages, %d unlaunched placeholders'
          % (len(SKIP), len(PLACEHOLDER)))


if __name__ == '__main__':
    main()
