// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.
import * as msg from "gen/cli/msg_generated";
import * as flatbuffers from "./flatbuffers";
import * as dispatch from "./dispatch";
import { assert } from "./util";
import { FileInfo, FileInfoImpl } from "./file_info";
import { platform } from "./platform";

const isWindows = platform.os === "win";

function name(filename: string): string {
  if (isWindows) {
    return filename.replace(/(.*)([\\])([^\\]*\\?$)/, "$3");
  } else {
    return filename.replace(/(.*)([\/])([^\/]*\/?$)/, "$3");
  }
}

function req(
  filename: string,
  lstat: boolean
): [flatbuffers.Builder, msg.Any, flatbuffers.Offset] {
  const builder = flatbuffers.createBuilder();
  const filename_ = builder.createString(filename);
  msg.Stat.startStat(builder);
  msg.Stat.addFilename(builder, filename_);
  msg.Stat.addLstat(builder, lstat);
  const inner = msg.Stat.endStat(builder);
  return [builder, msg.Any.Stat, inner];
}

function res(baseRes: null | msg.Base): FileInfo {
  assert(baseRes != null);
  assert(msg.Any.StatRes === baseRes!.innerType());
  const res = new msg.StatRes();
  assert(baseRes!.inner(res) != null);
  return new FileInfoImpl(res);
}

/** Queries the file system for information on the path provided. If the given
 * path is a symlink information about the symlink will be returned.
 *
 *       const fileInfo = await Deno.lstat("hello.txt");
 *       assert(fileInfo.isFile());
 */
export async function lstat(filename: string): Promise<FileInfo> {
  const f = await res(await dispatch.sendAsync(...req(filename, true)));
  f.path = filename;
  f.name = name(filename);
  return f;
}

/** Queries the file system for information on the path provided synchronously.
 * If the given path is a symlink information about the symlink will be
 * returned.
 *
 *       const fileInfo = Deno.lstatSync("hello.txt");
 *       assert(fileInfo.isFile());
 */
export function lstatSync(filename: string): FileInfo {
  const f = res(dispatch.sendSync(...req(filename, true)));
  f.path = filename;
  f.name = name(filename);
  return f;
}

/** Queries the file system for information on the path provided. `stat` Will
 * always follow symlinks.
 *
 *       const fileInfo = await Deno.stat("hello.txt");
 *       assert(fileInfo.isFile());
 */
export async function stat(filename: string): Promise<FileInfo> {
  const f = await res(await dispatch.sendAsync(...req(filename, false)));
  f.path = filename;
  f.name = name(filename);
  return f;
}

/** Queries the file system for information on the path provided synchronously.
 * `statSync` Will always follow symlinks.
 *
 *       const fileInfo = Deno.statSync("hello.txt");
 *       assert(fileInfo.isFile());
 */
export function statSync(filename: string): FileInfo {
  const f = res(dispatch.sendSync(...req(filename, false)));
  f.path = filename;
  f.name = name(filename);
  return f;
}
