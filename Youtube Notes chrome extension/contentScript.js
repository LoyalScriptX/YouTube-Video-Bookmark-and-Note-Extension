(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];
  let currentVideoNotes = "";

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (obj) => {
        resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    });
  };

  const fetchNotes = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo + "_notes"], (obj) => {
        resolve(obj[currentVideo + "_notes"] ? obj[currentVideo + "_notes"] : "");
      });
    });
  };

  const saveNotes = (notes) => {
    chrome.storage.sync.set({
      [currentVideo + "_notes"]: notes
    });
  };

  const addNewBookmarkEventHandler = async () => {
    const currentTime = youtubePlayer.currentTime;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
    };

    currentVideoBookmarks = await fetchBookmarks();

    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))
    });
  };

  const createNotepad = (initialNotes) => {
    const notesTextarea = document.createElement("textarea");

    notesTextarea.className = "notes-textarea";
    notesTextarea.placeholder = "Write your notes here...";
    notesTextarea.style.position = "fixed";
    notesTextarea.style.top = "10px";
    notesTextarea.style.right = "10px";
    notesTextarea.style.width = "300px";
    notesTextarea.style.height = "200px";
    notesTextarea.style.zIndex = "1000";
    notesTextarea.value = initialNotes;

    document.body.appendChild(notesTextarea);

    notesTextarea.addEventListener("input", () => {
      saveNotes(notesTextarea.value);
    });
  };

  const newVideoLoaded = async () => {
    const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];
    const notesTextareaExists = document.getElementsByClassName("notes-textarea")[0];

    currentVideoBookmarks = await fetchBookmarks();
    currentVideoNotes = await fetchNotes();

    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img");

      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button " + "bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";

      youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
      youtubePlayer = document.getElementsByClassName('video-stream')[0];

      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
    }

    if (!notesTextareaExists) {
      createNotepad(currentVideoNotes);
    } else {
      document.getElementsByClassName("notes-textarea")[0].value = currentVideoNotes;
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
    } else if (type === "PLAY") {
      youtubePlayer.currentTime = value;
    } else if ( type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
      chrome.storage.sync.set({ [currentVideo]: JSON.stringify(currentVideoBookmarks) });

      response(currentVideoBookmarks);
    }
  });

  const getTime = t => {
    var date = new Date(0);
    date.setSeconds(t);

    return date.toISOString().substr(11, 8);
  };

  newVideoLoaded();
})();
