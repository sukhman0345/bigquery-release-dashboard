import os
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache
feed_cache = {
    'data': None,
    'last_updated': None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes_feed(xml_content):
    """
    Parses the BigQuery release notes Atom feed XML.
    Splits multi-item day updates into individual, granular cards for the UI.
    """
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"XML Parsing Error: {e}")
        return []

    all_updates = []
    
    # Process each <entry>
    for entry in root.findall('atom:entry', namespaces):
        title_el = entry.find('atom:title', namespaces)
        date_str = title_el.text if title_el is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', namespaces)
        updated_str = updated_el.text if updated_el is not None else ""
        
        # Link mapping
        link_el = entry.find('atom:link[@rel="alternate"]', namespaces)
        if link_el is None:
            link_el = entry.find('atom:link', namespaces)
        link_str = link_el.attrib.get('href', '') if link_el is not None else ""
        
        id_el = entry.find('atom:id', namespaces)
        base_id = id_el.text if id_el is not None else ""
        
        content_el = entry.find('atom:content', namespaces)
        if content_el is not None and content_el.text:
            content_html = content_el.text
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Split items inside the entry content based on <h3> headers
            current_type = "Update"
            current_content_parts = []
            item_index = 0
            
            # Iterate through child nodes to group description elements with their preceding <h3>
            for child in soup.contents:
                # Filter out raw strings that are just whitespace
                if child.name == 'h3':
                    # If we already have content for a previous item, save it first
                    if current_content_parts:
                        item_html = "".join(str(c) for c in current_content_parts)
                        text_content = BeautifulSoup(item_html, 'html.parser').get_text(separator=' ', strip=True)
                        all_updates.append({
                            'id': f"{base_id}_{item_index}",
                            'date': date_str,
                            'timestamp': updated_str,
                            'type': current_type,
                            'content': item_html,
                            'text_content': text_content,
                            'link': link_str
                        })
                        item_index += 1
                        current_content_parts = []
                    current_type = child.get_text(strip=True)
                else:
                    if str(child).strip():
                        current_content_parts.append(child)
            
            # Save the final item in the entry
            if current_content_parts:
                item_html = "".join(str(c) for c in current_content_parts)
                text_content = BeautifulSoup(item_html, 'html.parser').get_text(separator=' ', strip=True)
                all_updates.append({
                    'id': f"{base_id}_{item_index}",
                    'date': date_str,
                    'timestamp': updated_str,
                    'type': current_type,
                    'content': item_html,
                    'text_content': text_content,
                    'link': link_str
                })
        else:
            # Fallback if there is no content body
            all_updates.append({
                'id': base_id,
                'date': date_str,
                'timestamp': updated_str,
                'type': 'Update',
                'content': '<p>No details provided.</p>',
                'text_content': 'No details provided.',
                'link': link_str
            })
            
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Check if we should use cached data
    if not force_refresh and feed_cache['data'] is not None:
        return jsonify({
            'source': 'cache',
            'updates': feed_cache['data']
        })
        
    try:
        # Fetch fresh data
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        updates = parse_release_notes_feed(response.content)
        
        # Save cache
        feed_cache['data'] = updates
        
        return jsonify({
            'source': 'network',
            'updates': updates
        })
    except Exception as e:
        # Return cache as fallback if network request fails
        if feed_cache['data'] is not None:
            return jsonify({
                'source': 'cache_fallback',
                'error': str(e),
                'updates': feed_cache['data']
            })
        return jsonify({
            'error': f"Failed to fetch feed: {str(e)}",
            'updates': []
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
