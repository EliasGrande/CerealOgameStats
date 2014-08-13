
# greasetools is required, you can get it from:
# https://github.com/EliasGrande/GreaseTools

# src
usersrc = ./src/cereal-ogame-stats.user.js

# constants
VERSION := $(shell greasetools meta-key version $(usersrc))
BROWSER = firefox

# dist
distdir     = ./dist/releases
userdist    = $(distdir)/latest.user.js
metadist    = $(distdir)/latest.meta.js
versiondist = $(distdir)/$(VERSION).user.js

.PHONY: dist test install clean

dist: $(userdist) $(metadist) $(versiondist)

$(userdist): $(usersrc)
	greasetools compress -o $(userdist) $(usersrc)

$(metadist): $(usersrc)
	greasetools meta-block -o $(metadist) $(usersrc)

$(versiondist): $(userdist)
	echo "$(VERSION)" | grep -qE '^[0-9]+(\.[0-9]+)*$$'
	cp $(userdist) $(versiondist)
	git add $(versiondist)

test:
	greasetools install -b $(BROWSER) $(usersrc)

install: $(userdist)
	greasetools install -b $(BROWSER) $(userdist)

clean:
	greasetools clean-trash -r


