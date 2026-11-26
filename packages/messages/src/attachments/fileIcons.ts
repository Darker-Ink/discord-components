import acrobat from '../assets/file-icons/icon-file-acrobat.svg';
import ae from '../assets/file-icons/icon-file-ae.svg';
import ai from '../assets/file-icons/icon-file-ai.svg';
import archive from '../assets/file-icons/icon-file-archive.svg';
import audio from '../assets/file-icons/icon-file-audio.svg';
import code from '../assets/file-icons/icon-file-code.svg';
import document from '../assets/file-icons/icon-file-document.svg';
import image from '../assets/file-icons/icon-file-image.svg';
import ps from '../assets/file-icons/icon-file-ps.svg';
import sketch from '../assets/file-icons/icon-file-sketch.svg';
import spreadsheet from '../assets/file-icons/icon-file-spreadsheet.svg';
import unknown from '../assets/file-icons/icon-file-unknown.svg';
import video from '../assets/file-icons/icon-file-video.svg';
import webcode from '../assets/file-icons/icon-file-webcode.svg';

export const FILE_ICONS: Record<string, string> = {
  acrobat,
  ae,
  ai,
  archive,
  audio,
  code,
  document,
  image,
  // The client's type for Photoshop files is "photoshop", but its icon file is named "ps".
  photoshop: ps,
  ps,
  sketch,
  spreadsheet,
  unknown,
  video,
  webcode,
};
