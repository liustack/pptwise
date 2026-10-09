-- PowerPoint 修复弹窗探针。用法：osascript scripts/ppt-repair-check.applescript /abs/path/deck.pptx
-- 只碰自己的文件：先把 pptx 复制进 PowerPoint 沙盒的临时目录（沙盒外的文件会弹
-- "Grant File Access"，探针答不了），打开这份副本，从它自己的窗口读结论，只关这一个
-- 演示文稿。PowerPoint 原本开着就继续开着，别人的文件不动。原本没开就在结束时退出。
-- 输出 OK、REPAIR_DIALOG、REPAIRED_TITLE 或 TIMEOUT。
on run argv
  set srcPath to item 1 of argv
  set wasRunning to application "Microsoft PowerPoint" is running

  -- 唯一文件名，窗口标题只会匹配到这一份副本
  set probeDir to do shell script "mkdir -p \"$HOME/Library/Containers/com.microsoft.Powerpoint/Data/tmp\" && mktemp -d \"$HOME/Library/Containers/com.microsoft.Powerpoint/Data/tmp/pptwise-probe.XXXXXX\""
  set fileName to "pptwise-probe-" & (do shell script "basename " & quoted form of probeDir & " | cut -d. -f2")
  set probePath to probeDir & "/" & fileName & ".pptx"
  do shell script "cp " & quoted form of srcPath & " " & quoted form of probePath

  ignoring application responses
    tell application "Microsoft PowerPoint"
      open (POSIX file probePath)
    end tell
  end ignoring

  set verdict to "TIMEOUT"
  repeat with i from 1 to 30
    delay 1
    tell application "System Events"
      if exists process "Microsoft PowerPoint" then
        tell process "Microsoft PowerPoint"
          -- 修复弹窗：找 Repair 按钮
          repeat with w in windows
            try
              if exists (button "Repair" of w) then
                set verdict to "REPAIR_DIALOG"
                exit repeat
              end if
            end try
          end repeat
          if verdict is "TIMEOUT" then
            -- 正常打开：标题含本副本文件名的窗口，含 Repaired 说明被修过
            repeat with w in windows
              try
                set wname to name of w
                if wname contains fileName then
                  if wname contains "Repaired" then
                    set verdict to "REPAIRED_TITLE"
                  else
                    set verdict to "OK"
                  end if
                  exit repeat
                end if
              end try
            end repeat
          end if
        end tell
      end if
    end tell
    if verdict is not "TIMEOUT" then exit repeat
  end repeat

  -- 只关自己打开的那份。修复弹窗挡着或超时时可能关不掉，那就连副本和 PowerPoint 一起留给人看
  set closed to false
  try
    with timeout of 20 seconds
      tell application "Microsoft PowerPoint" to close presentation (fileName & ".pptx") saving no
    end timeout
    set closed to true
  end try
  if closed then
    if not wasRunning then
      try
        with timeout of 20 seconds
          tell application "Microsoft PowerPoint" to quit saving no
        end timeout
      end try
    end if
    do shell script "rm -rf " & quoted form of probeDir
  end if
  return verdict
end run
