"""This script has following two functionarities:
   1. Renumber frame-no according to image names supplied.
   2. Convert polygon annotation to rotbox type.

Usage:

    python conv-cvat-rotbx.py [options...] source-cvat-xml [imagelist-file]

    Options:
      --output <output-cvat-xml>    Specifies output file name
      --rotbox                      Convert polygon annotation to rotbox
      --rotbox-exclude <ExcClass1,ExcClass2,...>
                                    When converting from polygon to rotbox,
                                    annotations with labels specified are leaved as is.
    source-cvat-xml  ... Cvat xml file to convert.
    imagelist-file   ... A file contains image-name list from working cvat server's task
                         which is an output from get-task-imagenames.py script.
                         The list consists image names without path and extension.
                         The order of the list represents their frame-no.
                         If this argument is ommitted, no frame-no renumber occurs.
"""
import os
import xml.etree.ElementTree as ET
import argparse
import sys

def read_imagelist(filename):
    """Reads imagelist file

    Args:
       filename   (str)  : Imagelist file name

    Returns:
       Dictionary of frame-no by image name
    """
    results = {}
    with open(filename) as f:
        for n, line in enumerate(f):
           imgname = line.rstrip()
           results[imgname] = n
    return results

def make_rotbox(polytag):
    """Makes rotbox annotation node
    Only a polygon with 4 points is converted.

    Args:
        polytag  (XmlElement) : Polygon tag object

    Returns:
        True if the element is converted to rotbox.
    """
    def s(v, ix):
        return float(v.split(",")[ix])

    points = [(s(v, 0), s(v, 1)) for v in polytag.get('points').split(';')]
    if len(points) == 4:
        polytag.tag = "rotbox"
        return True
    else:
        return False

def renumber_frames(args, imagedic):
    """Renumber frame-no and convert polygons to rotboxes

    Args:
        args      : Program arguments
        imagedic  : frame-no by imagename, or None
    """
    tree = ET.parse(args.src_xmlfile)
    root = tree.getroot()
    image_cnt = 0
    obj_cnt = 0
    rotbox_cnt = 0
    error_cnt = 0
    missing = []
    for image in root.findall('./image'):
        id = image.get('id')
        image_cnt += 1
        fullname = image.get('name')
        purename = fullname.split('/')[-1]
        purename = purename.split('.')[0]
        if imagedic is None:
            newid = id
        else:
            try:
                newid = imagedic[purename]
            except KeyError:
                missing += [purename]
            del imagedic[purename]
        image.set('id', str(newid))
        if args.rotbox:
           for polytag in image.findall('polygon'):
               label = polytag.get('label')
               if label not in args.rotbox_exclude:
                   if make_rotbox(polytag):
                       rotbox_cnt += 1
                   else:
                       error_cnt += 1
               obj_cnt += 1
    tree.write(args.output)
    print("Outputfile: %s" % (args.output,), file=sys.stderr)
    print("Total %d image tags found" % (image_cnt,), file=sys.stderr)
    if imagedic:
        print("Missing ids: %d" % (len(missing),), file=sys.stderr)
        for m in missing:
            print("    %s" % (m,), file=sys.stderr)
        print("Not refered: %d" % (len(imagedic),), file=sys.stderr)
    if args.rotbox:
        print("Objects: %d" % (obj_cnt,), file=sys.stderr)
        print("Rotbox: %d" % (rotbox_cnt,), file=sys.stderr)
        print("Conversion Error: %d" % (error_cnt,), file=sys.stderr)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("src_xmlfile")
    parser.add_argument("imagelist", nargs='?', default=None)
    parser.add_argument("--output", "-o", help="Output xml file")
    parser.add_argument("--rotbox", "-r", action="store_true", help="Convert to rotbox")
    parser.add_argument("--rotbox_exclude", "--rotbox-exclude", help="Labels not to convert rotbox")
    args = parser.parse_args()
    if args.output is None: args.output = "converted-annotation.xml"
    if args.rotbox_exclude is None:
        args.rotbox_exlude = set()
    else:
        args.rotbox_exclude = set(args.rotbox_exclude.split(","))
        args.rotbox = True
    print(args.rotbox_exclude)
    if args.imagelist:
        imgdic = read_imagelist(args.imagelist)
    else:
        imgdic = None
    renumber_frames(args, imgdic)

