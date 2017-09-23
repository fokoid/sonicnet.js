# SonicNet: Ultrasonic Networking

Originally written by Boris Smus. Updated and packaged by Alex Thorne as part of
CodeSmith Summer Academy of Code, Oxford 2017. See
<http://smus.com/ultrasonic-networking> for a discussion of the original idea
and codebase.

## Transmission parameters

- alphabet: set of characters that can be transmitted.
- char duration: how long a character is transmitted for.
- start character: the "message start" delimiter.
- end character: the "message end" delimiter.

Each message is a string of characters from the alphabet. Adjacent
characters cannot be repeated.
