# CVAT with Rotated Bounding Box support (rotbox)

This project is one of the forks of CVAT implementing Rotated Bounding Box.
It seems an official version of Rotated Bounding box support is scheduled
as v2.0.

This project is not following the official version, so this version is
completely different from the official version as of its specification
and dataformat.

A new datatype is introduced for rotated bounding box annotation. The
internal format of rotbox is a polygon with 4 points which has constraint
of making a rectangular shape.

Importing rotbox annotations is still under construction. Export format
is limited to cvat 1.1. Rotbox annotations in cvat are formed as polygons
which has nested rotbox element inside polygon tags like the followings:

```
<?xml version="1.0" encoding="utf-8"?>
<annotations>
  <version>1.1</version>
  <meta> ... </meta>
  <image id="0" name="PXL_20210129_013213855.jpg" width="2922" height="2191">
    <polygon label="LABEL01" occluded="0" source="manual" points="386.80,780.31;449.34,702.28;922.98,1081.91;860.43,1159.94" z_order="0">
      <rotbox cx="654.89" cy="931.11" width="607.00" height="100.00" angle="38.71">
      </rotbox>
    </polygon>
    <polygon label="LABEL01" occluded="0" source="manual" points="764.47,796.46;827.02,718.43;1300.65,1098.06;1238.11,1176.09" z_order="0">
      <rotbox cx="1032.56" cy="947.26" width="607.00" height="100.00" angle="38.71">
      </rotbox>
    </polygon>
</annotations>
```

## A brief operation manual

* Draw a rotbox shape.
  1. Drag and draw a rectangle's center line.
  2. Resize its width dragging one of half circle shaped handles shown on sides.
  3. Drag a head handle or a tail handle to adjust its angle.
  4. Click an arrow displayed in the center to flip its direction.
  5. Shift + Click it to flip its width and height.

[![Watch the video](./site/static/usage.png)](./site/static/cvat-rotbox-usage.mp4)