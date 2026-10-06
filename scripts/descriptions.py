"""Descriptions derived only from imported GTD text or explicit structured fields."""
import json
import re


def excerpt(text, limit=360):
    if len(text) <= limit:
        return text
    head = text[:limit]
    sentences = list(re.finditer(r'[.!?](?:\s|$)', head))
    if sentences and sentences[-1].end() >= 100:
        return head[:sentences[-1].start()+1]
    return head.rsplit(' ', 1)[0].rstrip(' ,;:') + '…'


def known_text(value):
    text = str(value or '').strip()
    return None if text.lower() in {'', 'unknown', 'unspecified', 'not known', 'n/a'} else text


def make_description(event, record):
    sources = json.loads(record['sources'])
    summary = known_text(record['summary'])
    if summary:
        return {'kind':'gtd', 'label':'Description from GTD', 'text':summary,
                'excerpt':excerpt(summary), 'sources':sources}
    facts = []
    city = known_text(event['city'])
    location = f"{city}, {event['country']}" if city else event['country']
    facts.append(f"GTD records this event in {location}.")
    attack = known_text(record['attack_type'])
    target = known_text(record['target'])
    if attack:
        facts.append(f"Attack type recorded by GTD: {attack}.")
    if target:
        facts.append(f"Target recorded by GTD: {target}.")
    for field, label in [('fatalities','Fatalities'), ('injuries','Injuries')]:
        value = event[field]
        facts.append(f"{label} reported by GTD: {value:g}." if value is not None else f"{label} are not recorded.")
    text = ' '.join(facts)
    return {'kind':'fields', 'label':'Description based on GTD fields', 'text':text,
            'excerpt':excerpt(text), 'sources':sources}
