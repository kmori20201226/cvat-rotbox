import xml.etree.ElementTree as ET
import os
import json

def read_annotation(annotfile, colordic):
    tree = ET.parse(annotfile)
    root = tree.getroot()
    for x in root.findall('./meta/task/labels/label'):
        name = x.find('./name').text
        color = x.find('./color').text
        colordic[name] = color

        
def read_annotations(annotdir):
    colordic = {}
    for subdir in os.listdir(annotdir):
        print(subdir)
        fullpath = os.path.join(annotdir, subdir, "annotations_area.xml")
        if os.path.exists(fullpath):
             read_annotation(fullpath, colordic)
    colorarr = []
    for label, color in colordic.items():
        colorarr += [
           dict(name = label,
                color = color,
                attributes = [])
        ]
    s = json.dumps(colorarr, indent=2)
    print(s)

if __name__ == '__main__':
    read_annotations(r"/user-data/02_annotation/10月版アノテーション/09.Task00-Task20(点地物形状修正版)/cvat-xml(annotation)/")
